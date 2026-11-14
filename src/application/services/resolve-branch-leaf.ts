import type { IEdgeRepository } from '@application/repositories';
import type { Edge } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ResolveBranchLeafDependencies = {
  readonly edgeRepository: Pick<IEdgeRepository, 'findBySourceNodeId'>;
};

const newestContinuation = (edges: readonly Edge[]): Edge | undefined =>
  edges
    .filter((edge) => edge.edgeType === 'continuation')
    .reduce<
      Edge | undefined
    >((newest, edge) => (!newest || edge.createdAt.getTime() > newest.createdAt.getTime() ? edge : newest), undefined);

/**
 * The end of the branch that runs down from `nodeId`, the node Latent
 * Spaces' "Retrace Branch" makes current (`LoomTree.retrace(from:)`, which
 * follows each node's remembered child to a leaf).
 *
 * Aspen Grove keeps no remembered child per node, so the branch is: the
 * active path, for as long as it runs through the node, and past its end the
 * newest continuation at each step. A node off the active path follows its
 * newest continuations all the way down.
 */
export const resolveBranchLeaf = async (
  nodeId: ULID,
  activePathNodeIds: readonly ULID[],
  dependencies: ResolveBranchLeafDependencies
): Promise<ULID> => {
  const pathIndexById = new Map(
    activePathNodeIds.map((id, index) => [id, index] as const)
  );
  const visited = new Set<ULID>();
  let cursor = nodeId;

  while (!visited.has(cursor)) {
    visited.add(cursor);
    const pathIndex = pathIndexById.get(cursor);
    if (pathIndex !== undefined && pathIndex < activePathNodeIds.length - 1) {
      cursor = activePathNodeIds[pathIndex + 1];
      continue;
    }
    const next = newestContinuation(
      await dependencies.edgeRepository.findBySourceNodeId(cursor)
    );
    if (!next) {
      break;
    }
    cursor = next.targetNodeId;
  }
  return cursor;
};
