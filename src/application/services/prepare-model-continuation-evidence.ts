import type {
  CreateRawApiResponseInput,
  INodeRepository,
} from '@application/repositories';
import { computeModelContentHash } from '@application/services/content-hash-service';
import type { BufferNodeInfo, Node, Provider } from '@domain/entities';
import {
  createLocalId,
  createULID,
  type ContentHash,
  type ULID,
} from '@domain/value-objects';
import type { CompletionResponse } from './llm';

export type PrepareModelContinuationEvidenceInput = {
  readonly loomTreeId: ULID;
  readonly parentHashes: readonly ContentHash[];
  readonly modelAgentId: ULID;
  readonly requestedModelIdentifier: string;
  readonly provider: Provider;
  readonly completion: CompletionResponse;
  readonly textPolicy: 'dialogue-trim' | 'literal';
  readonly buffer?: BufferNodeInfo;
  readonly nodeRepository: Pick<INodeRepository, 'getAllLocalIds'>;
};

export type PreparedModelContinuationEvidence = {
  readonly node: Node;
  readonly rawApiResponse: CreateRawApiResponseInput;
};

/** Builds the immutable node and raw-evidence inputs from one completion. */
export const prepareModelContinuationEvidence = async (
  input: PrepareModelContinuationEvidenceInput
): Promise<PreparedModelContinuationEvidence> => {
  const text =
    input.textPolicy === 'dialogue-trim'
      ? input.completion.content.trim()
      : input.completion.content;
  if (text.length === 0) {
    throw new Error('Model provider returned empty completion content.');
  }

  const id = createULID();
  const createdAt = new Date();
  const localIds = await input.nodeRepository.getAllLocalIds(input.loomTreeId);
  const content = { type: 'text' as const, text };
  const contentHash = await computeModelContentHash(
    content,
    [...input.parentHashes],
    createdAt,
    input.modelAgentId,
    input.completion.rawResponse.rawBytesHash
  );
  const node: Node = {
    id,
    createdAt,
    loomTreeId: input.loomTreeId,
    localId: createLocalId(id, localIds),
    content,
    authorAgentId: input.modelAgentId,
    authorType: 'model',
    contentHash,
    metadata: {
      bookmarked: false,
      pruned: false,
      excluded: false,
      ...(input.buffer ? { buffer: input.buffer } : {}),
    },
  };

  return {
    node,
    rawApiResponse: {
      nodeId: id,
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
    },
  };
};
