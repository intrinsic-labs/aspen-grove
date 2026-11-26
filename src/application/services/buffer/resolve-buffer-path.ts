import type { Edge, PathSelection } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import {
  type BufferGraph,
  compareEdgesNewestFirst,
  primarySourceIds,
} from './buffer-graph';
import { latestVersion } from './version-family';

/**
 * Pure buffer path resolution (docs/architecture/specs/buffer-mode.md, "Path
 * Resolution Logic"). A path is an ordered list of exact node versions, root
 * to leaf. Nothing here throws on bad input; defects come back as `issues`.
 */
export type BufferPathAction =
  | { readonly kind: 'open' }
  | {
      readonly kind: 'version' | 'branch';
      /** Index in the sequence of the position being switched. */
      readonly position: number;
      /** The version to substitute, or the first node of the other branch. */
      readonly nodeId: ULID;
    };

/**
 * An incoming selection to upsert, keyed by its child. The caller supplies
 * `id`, `pathId` and `updatedAt`; a pure resolver cannot mint them.
 */
export type BufferSelection = Pick<
  PathSelection,
  'targetNodeId' | 'selectedEdgeId' | 'selectedSourceNodeId'
>;

export type BufferPathIssue =
  | { readonly kind: 'empty-graph' }
  | { readonly kind: 'sequence-repaired'; readonly validLength: number }
  | { readonly kind: 'sequence-extended'; readonly fromPosition: number }
  | { readonly kind: 'suffix-replaced'; readonly fromPosition: number }
  | { readonly kind: 'walk-cycle'; readonly nodeId: ULID }
  | {
      readonly kind: 'action-rejected';
      readonly reason:
        | 'unknown-node'
        | 'position-out-of-range'
        | 'wrong-family'
        | 'same-family'
        | 'not-linked';
    };

export type ResolvedBufferPath = {
  /** Exact active version ids, root first, leaf last. */
  readonly nodeIds: readonly ULID[];
  readonly leafId: ULID | undefined;
  /** Incoming selections for ambiguous transitions only. */
  readonly selections: readonly BufferSelection[];
  readonly issues: readonly BufferPathIssue[];
};

/** The newest continuation edge from `from` into `to`, if `from` is a primary source. */
const linkEdge = (graph: BufferGraph, from: ULID, to: ULID): Edge | undefined =>
  [...(graph.incoming.get(to) ?? [])]
    .filter((edge) => primarySourceIds(edge).has(from))
    .sort(compareEdgesNewestFirst)[0];

const familyOf = (graph: BufferGraph, id: ULID): ULID | undefined =>
  graph.familyOf.get(id);

/** A remembered selection counts only if it names `parentId` and a real link. */
const isValidSelection = (
  graph: BufferGraph,
  selection: PathSelection,
  parentId: ULID
): boolean => {
  const { selectedEdgeId, selectedSourceNodeId, targetNodeId } = selection;
  if (!selectedEdgeId && !selectedSourceNodeId) return false;
  if (selectedSourceNodeId && selectedSourceNodeId !== parentId) return false;
  if (selectedEdgeId) {
    const edge = graph.edgesById.get(selectedEdgeId);
    if (!edge || edge.targetNodeId !== targetNodeId) return false;
    if (!primarySourceIds(edge).has(parentId)) return false;
  }
  return linkEdge(graph, parentId, targetNodeId) !== undefined;
};

/**
 * Which version of the child family `childId` belongs to follows `parentId`:
 * a valid remembered selection (newest, then id), otherwise the latest edit
 * (creation time, then id). Only versions `parentId` actually reaches count,
 * so a stale selection can never pull in another family.
 */
export const chooseChildVersion = (
  graph: BufferGraph,
  selections: readonly PathSelection[],
  parentId: ULID,
  childId: ULID
): ULID | undefined => {
  const family = familyOf(graph, childId);
  const reachable = (graph.versionsOf.get(family as ULID) ?? []).filter(
    (node) => linkEdge(graph, parentId, node.id)
  );
  const remembered = selections
    .filter(
      (s) =>
        reachable.some((node) => node.id === s.targetNodeId) &&
        isValidSelection(graph, s, parentId)
    )
    .sort(
      (a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime() ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
    )[0];
  return remembered?.targetNodeId ?? latestVersion(reachable)?.id;
};

/** Longest prefix of `sequence` that is a real root-to-leaf-direction walk. */
const validPrefixLength = (
  graph: BufferGraph,
  sequence: readonly ULID[]
): number => {
  const seen = new Set<ULID>();
  for (let i = 0; i < sequence.length; i += 1) {
    const id = sequence[i];
    const family = familyOf(graph, id);
    if (!family || seen.has(family)) return i;
    const linked =
      i === 0
        ? !graph.incoming.has(id)
        : linkEdge(graph, sequence[i - 1], id) !== undefined;
    if (!linked) return i;
    seen.add(family);
  }
  return sequence.length;
};

/**
 * Extends `ids` to a leaf. Child family: newest continuation, then id. Version
 * within it: `chooseChildVersion`. A family already on the path is never
 * re-entered, so cycles end the walk.
 */
const extendToLeaf = (
  graph: BufferGraph,
  selections: readonly PathSelection[],
  start: readonly ULID[],
  issues: BufferPathIssue[]
): ULID[] => {
  const ids = [...start];
  if (ids.length === 0) {
    const root = graph.rootIds[0];
    if (!root) {
      issues.push({ kind: 'empty-graph' });
      return ids;
    }
    const rootFamily = familyOf(graph, root);
    const versions = (graph.versionsOf.get(rootFamily as ULID) ?? []).filter(
      (node) => !graph.incoming.has(node.id)
    );
    ids.push((latestVersion(versions) ?? { id: root }).id);
  }
  const families = new Set(ids.map((id) => familyOf(graph, id) as ULID));

  for (;;) {
    const current = ids[ids.length - 1];
    const leaving = graph.outgoing.get(current) ?? [];
    const open = leaving.filter(
      (edge) => !families.has(familyOf(graph, edge.targetNodeId) as ULID)
    );
    if (open.length < leaving.length) {
      issues.push({ kind: 'walk-cycle', nodeId: current });
    }
    const newest = [...open].sort(compareEdgesNewestFirst)[0];
    if (!newest) return ids;
    const next = chooseChildVersion(
      graph,
      selections,
      current,
      newest.targetNodeId
    );
    if (!next) return ids;
    ids.push(next);
    families.add(familyOf(graph, next) as ULID);
  }
};

/** Incoming selections for transitions that are ambiguous in the graph. */
const selectionsFor = (
  graph: BufferGraph,
  ids: readonly ULID[]
): BufferSelection[] => {
  const result: BufferSelection[] = [];
  for (let i = 1; i < ids.length; i += 1) {
    const entering = graph.incoming.get(ids[i]) ?? [];
    const sources = new Set(entering.flatMap((e) => [...primarySourceIds(e)]));
    if (entering.length < 2 && sources.size < 2) continue;
    const edge = linkEdge(graph, ids[i - 1], ids[i]);
    result.push({
      targetNodeId: ids[i],
      selectedEdgeId: edge?.id,
      selectedSourceNodeId: ids[i - 1],
    });
  }
  return result;
};

const finish = (
  graph: BufferGraph,
  ids: readonly ULID[],
  issues: readonly BufferPathIssue[]
): ResolvedBufferPath => ({
  nodeIds: ids,
  leafId: ids[ids.length - 1],
  selections: selectionsFor(graph, ids),
  issues,
});

const openPath = (
  graph: BufferGraph,
  sequence: readonly ULID[],
  selections: readonly PathSelection[]
): ResolvedBufferPath => {
  const issues: BufferPathIssue[] = [];
  const validLength = validPrefixLength(graph, sequence);
  if (validLength < sequence.length) {
    issues.push({ kind: 'sequence-repaired', validLength });
  }
  const kept = sequence.slice(0, validLength);
  const ids = extendToLeaf(graph, selections, kept, issues);
  if (validLength === sequence.length && ids.length > kept.length) {
    issues.push({ kind: 'sequence-extended', fromPosition: kept.length });
  }
  return finish(graph, ids, issues);
};

const reject = (
  graph: BufferGraph,
  base: ResolvedBufferPath,
  reason: Extract<BufferPathIssue, { kind: 'action-rejected' }>['reason']
): ResolvedBufferPath =>
  finish(graph, base.nodeIds, [
    ...base.issues,
    { kind: 'action-rejected', reason },
  ]);

/**
 * `open` validates the stored exact sequence (an exact sequence beats any
 * default), repairing it from the first broken step. `version` swaps one id
 * and keeps the suffix when the next node is still reachable from it.
 * `branch` keeps the prefix, enters another child family of the same parent at
 * `nodeId` and follows that family's continuations to its leaf.
 */
export const resolveBufferPath = (
  graph: BufferGraph,
  sequence: readonly ULID[],
  selections: readonly PathSelection[],
  action: BufferPathAction
): ResolvedBufferPath => {
  const base = openPath(graph, sequence, selections);
  if (action.kind === 'open') return base;

  const { position, nodeId } = action;
  const ids = base.nodeIds;
  if (!graph.nodesById.has(nodeId)) return reject(graph, base, 'unknown-node');
  const minPosition = action.kind === 'branch' ? 1 : 0;
  if (position < minPosition || position >= ids.length) {
    return reject(graph, base, 'position-out-of-range');
  }
  const sameFamily = familyOf(graph, nodeId) === familyOf(graph, ids[position]);

  if (action.kind === 'branch') {
    if (sameFamily) return reject(graph, base, 'same-family');
    const prefix = ids.slice(0, position);
    const prefixFamilies = prefix.map((id) => familyOf(graph, id));
    if (
      prefixFamilies.includes(familyOf(graph, nodeId)) ||
      !linkEdge(graph, ids[position - 1], nodeId)
    ) {
      return reject(graph, base, 'not-linked');
    }
    const issues: BufferPathIssue[] = [];
    return finish(
      graph,
      extendToLeaf(graph, selections, [...prefix, nodeId], issues),
      issues
    );
  }

  if (!sameFamily) return reject(graph, base, 'wrong-family');
  if (nodeId === ids[position]) return base;
  const enteredFrom =
    position === 0
      ? !graph.incoming.has(nodeId)
      : linkEdge(graph, ids[position - 1], nodeId) !== undefined;
  if (!enteredFrom) return reject(graph, base, 'not-linked');

  const head = [...ids.slice(0, position), nodeId];
  const next = ids[position + 1];
  if (next === undefined || linkEdge(graph, nodeId, next)) {
    return finish(graph, [...head, ...ids.slice(position + 1)], []);
  }
  const issues: BufferPathIssue[] = [
    { kind: 'suffix-replaced', fromPosition: position + 1 },
  ];
  return finish(graph, extendToLeaf(graph, selections, head, issues), issues);
};
