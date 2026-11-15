import type { ULID } from '@domain/value-objects';

export type NodeBranchPosition = {
  /** Latent Spaces' `[n]`: the node and those after it on its branch. */
  readonly count: number;
  /** The active path runs through it (Latent Spaces' remembered child). */
  readonly onActivePath: boolean;
  /** The path's last node, which Rewind To Node can't move to. */
  readonly isCurrent: boolean;
};

/**
 * Where a node sits relative to the active path, for a sheet's subtitle and
 * menu. Counted as the continuation cards count it: along the path from the
 * node, or 1 for a node off it.
 */
export const toNodeBranchPosition = (
  nodeId: ULID,
  activePathNodeIds: readonly ULID[]
): NodeBranchPosition => {
  const index = activePathNodeIds.indexOf(nodeId);
  return {
    count: index === -1 ? 1 : activePathNodeIds.length - index,
    onActivePath: index !== -1,
    isCurrent: index !== -1 && index === activePathNodeIds.length - 1,
  };
};
