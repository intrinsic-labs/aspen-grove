import type {
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import type {
  BufferGenerationIntent,
  BufferSavedGenerationSlot,
  IBufferMutationRepository,
} from '@application/repositories/core/IBufferMutationRepository';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import type { ULID } from '@domain/value-objects';

type Dependencies = {
  readonly bufferMutationRepository: IBufferMutationRepository;
  readonly nodeRepository: Pick<
    INodeRepository,
    'findByLoomTreeId' | 'findById'
  >;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'findByLoomTreeId' | 'findContinuationsByTargetNodeId'
  >;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'findByNodeId'
  >;
};

const savedSlots = async (
  intent: BufferGenerationIntent,
  deps: Dependencies
): Promise<readonly BufferSavedGenerationSlot[]> => {
  const [nodes, edges] = await Promise.all([
    deps.nodeRepository.findByLoomTreeId(intent.treeId, true),
    deps.edgeRepository.findByLoomTreeId(intent.treeId),
  ]);
  const edgeByTarget = new Map(edges.map((edge) => [edge.targetNodeId, edge]));
  const found: BufferSavedGenerationSlot[] = [];
  for (const node of nodes) {
    const info = node.metadata.buffer;
    if (
      info?.drawId !== intent.drawId ||
      info.creationParentId !== intent.sourceNodeId ||
      info.slot === undefined
    ) {
      continue;
    }
    const edge = edgeByTarget.get(node.id);
    if (!edge) continue;
    const verified = await verifyModelNodeProvenance({
      nodeId: node.id,
      nodeRepository: deps.nodeRepository,
      edgeRepository: deps.edgeRepository,
      rawApiResponseRepository: deps.rawApiResponseRepository,
    });
    if (verified.isValid) {
      found.push({ slot: info.slot, nodeId: node.id, edgeId: edge.id });
    }
  }
  return found;
};

/** Finishes path activation from durable slots; it never repeats inference. */
export const repairPendingBufferGeneration = async (
  treeId: ULID,
  pathId: ULID,
  deps: Dependencies
): Promise<void> => {
  const intent = await deps.bufferMutationRepository.findPendingGeneration(
    treeId,
    pathId
  );
  if (!intent) return;
  await deps.bufferMutationRepository.completeGeneration(
    intent,
    await savedSlots(intent, deps)
  );
};
