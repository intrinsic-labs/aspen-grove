import type { PathSelection } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { type BufferGraph, primarySourceIds } from './buffer-graph';
import type { BufferSwitchAction } from './buffer-draft';
import {
  chooseChildVersion,
  type ResolvedBufferPath,
} from './resolve-buffer-path';

/** One thing the pill can switch to, with the exact action that selects it. */
export type BufferChoice = {
  readonly nodeId: ULID;
  readonly action: BufferSwitchAction;
};

/** The alternatives of one kind at a position, and which one is active. */
export type BufferChoiceSet = {
  readonly entries: readonly BufferChoice[];
  /** Index into `entries`; -1 only if the active node is not among them. */
  readonly active: number;
};

export type BufferPositionChoices = {
  readonly position: number;
  /** Sibling child families of the position's parent, in spec sibling order. */
  readonly branches: BufferChoiceSet;
  /** Versions of the position's family that the previous node reaches, oldest first. */
  readonly versions: BufferChoiceSet;
};

const none: BufferChoiceSet = { entries: [], active: -1 };

/** Whether `from` is a primary source of a continuation into `to`. */
const reaches = (graph: BufferGraph, from: ULID, to: ULID): boolean =>
  (graph.incoming.get(to) ?? []).some((edge) =>
    primarySourceIds(edge).has(from)
  );

const versionsAt = (
  graph: BufferGraph,
  ids: readonly ULID[],
  position: number
): BufferChoiceSet => {
  const family = graph.familyOf.get(ids[position]);
  const entries = (graph.versionsOf.get(family as ULID) ?? [])
    .filter((node) =>
      position === 0
        ? !graph.incoming.has(node.id)
        : reaches(graph, ids[position - 1], node.id)
    )
    .map<BufferChoice>((node) => ({
      nodeId: node.id,
      action: { kind: 'version', position, nodeId: node.id },
    }));
  return {
    entries,
    active: entries.findIndex((entry) => entry.nodeId === ids[position]),
  };
};

const branchesAt = (
  graph: BufferGraph,
  ids: readonly ULID[],
  selections: readonly PathSelection[],
  position: number
): BufferChoiceSet => {
  if (position < 1) return none;
  const parent = ids[position - 1];
  const onPath = new Set(
    ids.slice(0, position).map((id) => graph.familyOf.get(id))
  );
  const activeFamily = graph.familyOf.get(ids[position]);
  const entries: BufferChoice[] = [];
  let active = -1;
  for (const family of graph.childFamilies.get(
    graph.familyOf.get(parent) as ULID
  ) ?? []) {
    if (onPath.has(family)) continue;
    const first = (graph.versionsOf.get(family) ?? []).find((node) =>
      reaches(graph, parent, node.id)
    );
    if (!first) continue;
    const nodeId =
      family === activeFamily
        ? ids[position]
        : (chooseChildVersion(graph, selections, parent, first.id) ?? first.id);
    if (family === activeFamily) active = entries.length;
    entries.push({
      nodeId,
      action: { kind: 'branch', position, nodeId },
    });
  }
  return { entries, active };
};

/**
 * What the pill can offer at one path position. Every action listed is one
 * `resolveBufferPath` accepts: the UI never builds an action itself.
 */
export const describeBufferChoices = (
  graph: BufferGraph,
  resolved: ResolvedBufferPath,
  position: number,
  selections: readonly PathSelection[] = []
): BufferPositionChoices => {
  const ids = resolved.nodeIds;
  if (position < 0 || position >= ids.length)
    return { position, branches: none, versions: none };
  return {
    position,
    branches: branchesAt(graph, ids, selections, position),
    versions: versionsAt(graph, ids, position),
  };
};
