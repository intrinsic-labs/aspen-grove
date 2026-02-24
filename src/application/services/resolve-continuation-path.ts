import type {
  IEdgeRepository,
  INodeRepository,
} from '@application/repositories';
import type { ULID } from '@domain/value-objects';

export type ResolveContinuationPathDependencies = {
  readonly nodeRepository: Pick<INodeRepository, 'findById'>;
  readonly edgeRepository: Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
};

/**
 * Resolves a continuation path from root -> target node.
 *
 * Notes:
 * - Dialogue mode assumes one incoming continuation edge per non-root node.
 * - If multiple incoming continuation edges exist, resolution is ambiguous and fails.
 */
export const resolveContinuationPathToNode = async (
  targetNodeId: ULID,
  dependencies: ResolveContinuationPathDependencies
): Promise<readonly ULID[]> => {
  const { nodeRepository, edgeRepository } = dependencies;

  const reversePath: ULID[] = [];
  const visited = new Set<ULID>();

  let cursor: ULID | null = targetNodeId;
  while (cursor) {
    if (visited.has(cursor)) {
      throw new Error(`Cycle detected while resolving path at node ${cursor}.`);
    }
    visited.add(cursor);

    const node = await nodeRepository.findById(cursor, true);
    if (!node) {
      throw new Error(`Node not found while resolving path: ${cursor}`);
    }

    reversePath.push(node.id);

    const incoming = await edgeRepository.findContinuationsByTargetNodeId(node.id);
    if (incoming.length === 0) {
      break;
    }
    if (incoming.length > 1) {
      throw new Error(
        `Ambiguous path: node ${node.id} has ${incoming.length} incoming continuation edges.`
      );
    }

    const [incomingEdge] = incoming;
    const primarySource =
      incomingEdge.sources.find((source) => source.role === 'primary') ??
      incomingEdge.sources[0];

    if (!primarySource) {
      throw new Error(
        `Invalid continuation edge ${incomingEdge.id}: missing source nodes.`
      );
    }

    cursor = primarySource.nodeId;
  }

  return reversePath.reverse();
};

