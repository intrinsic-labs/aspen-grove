import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

/**
 * Version families for buffer mode. A family is every node that shares the
 * same ultimate `editedFrom` ancestor: the original passage and each edit of
 * it. The ancestor's id names the family. Pure; no repositories.
 */
export type LineageIssue =
  | { readonly kind: 'lineage-cycle'; readonly nodeIds: readonly ULID[] }
  | {
      readonly kind: 'broken-edited-from';
      readonly nodeId: ULID;
      readonly missingId: ULID;
    }
  | {
      readonly kind: 'cross-tree-edited-from';
      readonly nodeId: ULID;
      readonly editedFrom: ULID;
    };

export type VersionFamilies = {
  /** Node id to family id. Every input node has an entry. */
  readonly familyOf: ReadonlyMap<ULID, ULID>;
  /** Family id to its versions, oldest first (`compareVersions`). */
  readonly versionsOf: ReadonlyMap<ULID, readonly Node[]>;
  readonly issues: readonly LineageIssue[];
};

/** Oldest first by creation time, then id. The last element is the latest edit. */
export const compareVersions = (a: Node, b: Node): number =>
  a.createdAt.getTime() - b.createdAt.getTime() ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The latest edit among `versions`: newest creation time, then largest id. */
export const latestVersion = (versions: readonly Node[]): Node | undefined =>
  versions.reduce<Node | undefined>(
    (best, node) => (!best || compareVersions(node, best) > 0 ? node : best),
    undefined
  );

/**
 * Walks each node's `editedFrom` chain to its root. Lineage that loops, points
 * at a missing node or crosses trees cannot be trusted: such nodes become
 * singleton families (the chain is cut at the defect) and an issue is
 * reported, so the walk always terminates.
 */
export const resolveVersionFamilies = (
  nodes: readonly Node[]
): VersionFamilies => {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const familyOf = new Map<ULID, ULID>();
  const issues: LineageIssue[] = [];
  const cutAt = new Set<ULID>();

  for (const node of nodes) {
    const parentId = node.editedFrom;
    if (!parentId) continue;
    const parent = byId.get(parentId);
    if (!parent) {
      issues.push({
        kind: 'broken-edited-from',
        nodeId: node.id,
        missingId: parentId,
      });
      cutAt.add(node.id);
    } else if (parent.loomTreeId !== node.loomTreeId) {
      issues.push({
        kind: 'cross-tree-edited-from',
        nodeId: node.id,
        editedFrom: parentId,
      });
      cutAt.add(node.id);
    }
  }

  const settle = (trail: readonly ULID[], family: ULID): ULID => {
    // Cycle members already stand alone; everything else shares the root.
    for (const id of trail) if (!familyOf.has(id)) familyOf.set(id, family);
    return family;
  };

  const rootOf = (start: Node): ULID => {
    const trail: ULID[] = [];
    const onTrail = new Set<ULID>();
    let cursor: Node = start;
    for (;;) {
      const known = familyOf.get(cursor.id);
      if (known) return settle(trail, known);
      if (onTrail.has(cursor.id)) {
        // A cycle: its members cannot share a family; each stands alone.
        // Nodes that edit into it join the member they reach, the same
        // whichever node the walk started from.
        const members = trail.slice(trail.indexOf(cursor.id));
        issues.push({ kind: 'lineage-cycle', nodeIds: members });
        for (const member of members) familyOf.set(member, member);
        return settle(trail, cursor.id);
      }
      trail.push(cursor.id);
      onTrail.add(cursor.id);
      const next =
        cursor.editedFrom && !cutAt.has(cursor.id)
          ? byId.get(cursor.editedFrom)
          : undefined;
      if (!next) return settle(trail, cursor.id);
      cursor = next;
    }
  };

  for (const node of nodes) rootOf(node);

  const grouped = new Map<ULID, Node[]>();
  for (const node of nodes) {
    const family = familyOf.get(node.id) as ULID;
    grouped.set(family, [...(grouped.get(family) ?? []), node]);
  }
  const versionsOf = new Map(
    [...grouped].map(([family, members]) => [
      family,
      [...members].sort(compareVersions),
    ])
  );
  return { familyOf, versionsOf, issues };
};
