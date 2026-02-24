import type {
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { type CompletionResponse } from '@application/services/llm';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import { computeModelContentHash } from '@application/services/content-hash-service';
import type { Provider } from '@domain/entities';
import {
  createLocalId,
  createULID,
  type ContentHash,
  type ULID,
} from '@domain/value-objects';

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
  const assistantText = input.completion.content.trim();
  if (!assistantText) {
    throw new Error('Model provider returned empty completion content.');
  }

  const assistantNodeId = createULID();
  const assistantCreatedAt = new Date();
  const assistantLocalIds = await input.nodeRepository.getAllLocalIds(input.loomTreeId);
  const assistantLocalId = createLocalId(assistantNodeId, assistantLocalIds);
  const assistantContent = { type: 'text' as const, text: assistantText };
  const assistantContentHash = await computeModelContentHash(
    assistantContent,
    [input.parentNode.contentHash],
    assistantCreatedAt,
    input.modelAgentId,
    input.completion.rawResponse.rawBytesHash
  );

  const assistantNode = await input.nodeRepository.create({
    id: assistantNodeId,
    createdAt: assistantCreatedAt,
    loomTreeId: input.loomTreeId,
    localId: assistantLocalId,
    content: assistantContent,
    authorAgentId: input.modelAgentId,
    authorType: 'model',
    contentHash: assistantContentHash,
  });

  try {
    await input.rawApiResponseRepository.create({
      nodeId: assistantNode.id,
      provider: input.provider,
      requestId: input.completion.rawResponse.requestId,
      modelIdentifier:
        input.completion.rawResponse.modelIdentifier ??
        input.requestedModelIdentifier,
      responseBody: input.completion.rawResponse.responseBody,
      responseHeaders: input.completion.rawResponse.responseHeaders,
      requestTimestamp: input.completion.rawResponse.requestTimestamp,
      responseTimestamp: input.completion.rawResponse.responseTimestamp,
      latencyMs: input.completion.rawResponse.latencyMs,
      tokenUsage: input.completion.usage,
    });
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
