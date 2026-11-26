import type { Edge, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { type LineageIssue, resolveVersionFamilies } from './version-family';

export type BufferGraphIssue =
  | LineageIssue
  | {
      readonly kind: 'broken-edge-reference';
      readonly edgeId: ULID;
      readonly missingId: ULID;
    }
  | { readonly kind: 'cross-tree-edge'; readonly edgeId: ULID }
  | { readonly kind: 'traversal-cycle'; readonly familyIds: readonly ULID[] };

/**
 * Read-only indexes over one tree's nodes and edges. Only well-formed
 * `continuation` edges with a `primary` source are indexed for traversal;
 * annotation edges never carry the document. Maps preserve input order, which is the sibling order
 * (source-file order on import, request slot order within a draw).
 */
export type BufferGraph = {
  readonly nodesById: ReadonlyMap<ULID, Node>;
  readonly edgesById: ReadonlyMap<ULID, Edge>;
  /** Node id to family id (the ultimate `editedFrom` ancestor). */
  readonly familyOf: ReadonlyMap<ULID, ULID>;
  /** Family id to versions, oldest first. */
  readonly versionsOf: ReadonlyMap<ULID, readonly Node[]>;
  /** Target node id to the continuation edges that enter it. */
  readonly incoming: ReadonlyMap<ULID, readonly Edge[]>;
  /** Source node id to the continuation edges that leave it. */
  readonly outgoing: ReadonlyMap<ULID, readonly Edge[]>;
  /** Parent family to its child families, in order of first appearance. */
  readonly childFamilies: ReadonlyMap<ULID, readonly ULID[]>;
  /** Nodes no continuation enters, oldest first (time, then id). */
  readonly rootIds: readonly ULID[];
  readonly issues: readonly BufferGraphIssue[];
};

const push = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

/** Newest first by creation time, then largest id: the continuation convention. */
export const compareEdgesNewestFirst = (a: Edge, b: Edge): number =>
  b.createdAt.getTime() - a.createdAt.getTime() ||
  (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/** The distinct primary source ids of an indexed edge. */
export const primarySourceIds = (edge: Edge): ReadonlySet<ULID> =>
  new Set(
    edge.sources.filter((s) => s.role === 'primary').map((s) => s.nodeId)
  );

export const indexBufferGraph = (
  nodes: readonly Node[],
  edges: readonly Edge[]
): BufferGraph => {
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
  const lineage = resolveVersionFamilies(nodes);
  const issues: BufferGraphIssue[] = [...lineage.issues];
  const edgesById = new Map<ULID, Edge>();
  const incoming = new Map<ULID, Edge[]>();
  const outgoing = new Map<ULID, Edge[]>();
  const childLists = new Map<ULID, ULID[]>();

  for (const edge of edges) {
    edgesById.set(edge.id, edge);
    if (edge.edgeType !== 'continuation') continue;

    const referenced = [
      edge.targetNodeId,
      ...edge.sources.map((s) => s.nodeId),
    ];
    const missing = referenced.find((id) => !nodesById.has(id));
    if (missing) {
      issues.push({
        kind: 'broken-edge-reference',
        edgeId: edge.id,
        missingId: missing,
      });
      continue;
    }
    if (
      referenced.some((id) => nodesById.get(id)?.loomTreeId !== edge.loomTreeId)
    ) {
      issues.push({ kind: 'cross-tree-edge', edgeId: edge.id });
      continue;
    }

    // Only primary sources carry the document; context and instruction
    // sources keep their own semantics and never join a path.
    const primaries = new Set(
      edge.sources.filter((s) => s.role === 'primary').map((s) => s.nodeId)
    );
    if (primaries.size === 0) continue;

    push(incoming, edge.targetNodeId, edge);
    const targetFamily = lineage.familyOf.get(edge.targetNodeId) as ULID;
    for (const sourceId of primaries) {
      push(outgoing, sourceId, edge);
      const parentFamily = lineage.familyOf.get(sourceId) as ULID;
      const children = childLists.get(parentFamily) ?? [];
      if (!children.includes(targetFamily)) children.push(targetFamily);
      childLists.set(parentFamily, children);
    }
  }

  issues.push(...findTraversalCycles(childLists));

  const rootIds = nodes
    .filter((node) => !incoming.has(node.id))
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
    .map((node) => node.id);

  return {
    nodesById,
    edgesById,
    familyOf: lineage.familyOf,
    versionsOf: lineage.versionsOf,
    incoming,
    outgoing,
    childFamilies: childLists,
    rootIds,
    issues,
  };
};

/**
 * Cycles among families (a self-loop counts), one issue per back edge.
 * Iterative so a long document cannot overflow the call stack.
 */
const findTraversalCycles = (
  children: ReadonlyMap<ULID, readonly ULID[]>
): BufferGraphIssue[] => {
  const found: BufferGraphIssue[] = [];
  const state = new Map<ULID, 'open' | 'done'>();

  for (const start of children.keys()) {
    if (state.has(start)) continue;
    const stack: { family: ULID; next: number }[] = [
      { family: start, next: 0 },
    ];
    state.set(start, 'open');
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const siblings = children.get(frame.family) ?? [];
      if (frame.next >= siblings.length) {
        state.set(frame.family, 'done');
        stack.pop();
        continue;
      }
      const child = siblings[frame.next++];
      if (state.get(child) === 'open') {
        const from = stack.findIndex((f) => f.family === child);
        found.push({
          kind: 'traversal-cycle',
          familyIds: stack.slice(from).map((f) => f.family),
        });
      } else if (!state.has(child)) {
        state.set(child, 'open');
        stack.push({ family: child, next: 0 });
      }
    }
  }
  return found;
};
