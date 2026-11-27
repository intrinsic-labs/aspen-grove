import type {
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { type CompletionResponse } from '@application/services/llm';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import { prepareModelContinuationEvidence } from '@application/services/prepare-model-continuation-evidence';
import type { Provider } from '@domain/entities';
import { type ContentHash, type ULID } from '@domain/value-objects';

export type CreateVerifiedModelContinuationNodeInput = {
  readonly loomTreeId: ULID;
  readonly parentNode: {
    readonly id: ULID;
    readonly contentHash: ContentHash;
  };
  readonly modelAgentId: ULID;
  readonly requestedModelIdentifier: string;
  readonly provider: Provider;
  readonly completion: CompletionResponse;
  readonly nodeRepository: Pick<
    INodeRepository,
    'create' | 'getAllLocalIds' | 'hardDelete' | 'findById'
  >;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'create' | 'delete' | 'findContinuationsByTargetNodeId'
  >;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'create' | 'findByNodeId' | 'deleteByNodeId'
  >;
};

export type CreateVerifiedModelContinuationNodeResult = {
  readonly assistantNodeId: ULID;
  readonly rawApiResponseId?: ULID;
  readonly parentNodeCount?: number;
};

/**
 * Creates a model continuation node, stores raw API evidence, and verifies provenance.
 *
 * This flow is shared by linear turns and branching continuations.
 */
export const createVerifiedModelContinuationNode = async (
  input: CreateVerifiedModelContinuationNodeInput
): Promise<CreateVerifiedModelContinuationNodeResult> => {
  const prepared = await prepareModelContinuationEvidence({
    loomTreeId: input.loomTreeId,
    parentHashes: [input.parentNode.contentHash],
    modelAgentId: input.modelAgentId,
    requestedModelIdentifier: input.requestedModelIdentifier,
    provider: input.provider,
    completion: input.completion,
    textPolicy: 'dialogue-trim',
    nodeRepository: input.nodeRepository,
  });

  const assistantNode = await input.nodeRepository.create({
    ...prepared.node,
  });

  try {
    await input.rawApiResponseRepository.create(prepared.rawApiResponse);
  } catch (rawApiResponseError) {
    await input.nodeRepository.hardDelete(assistantNode.id).catch(() => {
      // Best effort cleanup only.
    });
    throw rawApiResponseError;
  }

  const continuationEdge = await input.edgeRepository.create({
    loomTreeId: input.loomTreeId,
    sources: [{ nodeId: input.parentNode.id, role: 'primary' }],
    targetNodeId: assistantNode.id,
    edgeType: 'continuation',
  });

  const provenanceVerification = await verifyModelNodeProvenance({
    nodeId: assistantNode.id,
    nodeRepository: input.nodeRepository,
    edgeRepository: input.edgeRepository,
    rawApiResponseRepository: input.rawApiResponseRepository,
  });

  if (!provenanceVerification.isValid) {
    await input.edgeRepository.delete(continuationEdge.id).catch(() => {
      // Best effort cleanup only.
    });
    await input.rawApiResponseRepository
      .deleteByNodeId(assistantNode.id)
      .catch(() => {
        // Best effort cleanup only.
      });
    await input.nodeRepository.hardDelete(assistantNode.id).catch(() => {
      // Best effort cleanup only.
    });
    throw new Error(
      `Provenance verification failed for model node ${assistantNode.id} (${provenanceVerification.status})`
    );
  }

  return {
    assistantNodeId: assistantNode.id,
    rawApiResponseId: provenanceVerification.rawApiResponseId,
    parentNodeCount: provenanceVerification.parentNodeCount,
  };
};
