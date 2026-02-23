import { describe, expect, it } from '@jest/globals';
import { computeModelContentHash, computeSha256Hash } from '@application/services/content-hash-service';
import type { Edge, Node, RawApiResponse } from '@domain/entities';
import type { ContentHash, ULID } from '@domain/value-objects';
import { verifyModelNodeProvenance } from './verify-model-node-provenance';

const now = new Date('2026-02-23T10:00:00.000Z');

const createNode = (input: {
  id: ULID;
  authorType: 'human' | 'model';
  authorAgentId: ULID;
  contentHash: ContentHash;
  text: string;
}): Node => ({
  id: input.id,
  localId: `${input.id.slice(0, 8)}` as Node['localId'],
  loomTreeId: '01KTESTTREE000000000000000' as ULID,
  content: { type: 'text', text: input.text },
  authorAgentId: input.authorAgentId,
  authorType: input.authorType,
  contentHash: input.contentHash,
  createdAt: now,
  metadata: {
    bookmarked: false,
    pruned: false,
    excluded: false,
  },
});

describe('verifyModelNodeProvenance', () => {
  it('returns valid for a model node with matching raw evidence', async () => {
    const parentNodeId = '01KTESTPARENT0000000000000' as ULID;
    const modelNodeId = '01KTESTMODEL00000000000000' as ULID;
    const modelAgentId = '01KTESTAGENT00000000000000' as ULID;
    const parentHash =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ContentHash;

    const parentNode = createNode({
      id: parentNodeId,
      authorType: 'human',
      authorAgentId: '01KTESTHUMAN00000000000000' as ULID,
      contentHash: parentHash,
      text: 'Parent',
    });

    const responseHeaders = 'x-request-id: req_123\ncontent-type: application/json';
    const responseBody = '{"id":"resp_123","choices":[{"message":{"content":"Hello"}}]}';
    const rawResponseHash = await computeSha256Hash(
      `${responseHeaders}\n\n${responseBody}`
    );
    const modelContentHash = await computeModelContentHash(
      { type: 'text', text: 'Hello' },
      [parentHash],
      now,
      modelAgentId,
      rawResponseHash
    );
    const modelNode = createNode({
      id: modelNodeId,
      authorType: 'model',
      authorAgentId: modelAgentId,
      contentHash: modelContentHash,
      text: 'Hello',
    });

    const continuationEdge: Edge = {
      id: '01KTESTEDGE000000000000000' as ULID,
      loomTreeId: modelNode.loomTreeId,
      sources: [{ nodeId: parentNodeId, role: 'primary' }],
      targetNodeId: modelNodeId,
      edgeType: 'continuation',
      createdAt: now,
    };

    const rawApiResponse: RawApiResponse = {
      id: '01KTESTRAW0000000000000000' as ULID,
      nodeId: modelNodeId,
      provider: 'openrouter',
      requestId: 'req_123',
      modelIdentifier: 'anthropic/claude-haiku-4.5',
      responseBody,
      responseHeaders,
      requestTimestamp: now,
      responseTimestamp: now,
      latencyMs: 1000,
      compressionType: 'none',
      createdAt: now,
    };

    const nodeById = new Map<ULID, Node>([
      [parentNodeId, parentNode],
      [modelNodeId, modelNode],
    ]);

    const result = await verifyModelNodeProvenance({
      nodeId: modelNodeId,
      nodeRepository: {
        findById: async (id) => nodeById.get(id) ?? null,
      },
      edgeRepository: {
        findContinuationsByTargetNodeId: async () => [continuationEdge],
      },
      rawApiResponseRepository: {
        findByNodeId: async () => rawApiResponse,
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('valid');
    expect(result.rawApiResponseId).toBe(rawApiResponse.id);
    expect(result.parentNodeCount).toBe(1);
  });

  it('returns missingRawApiResponse when model node has no stored evidence', async () => {
    const modelNodeId = '01KTESTMODELNOEVIDENCE00000' as ULID;
    const modelNode = createNode({
      id: modelNodeId,
      authorType: 'model',
      authorAgentId: '01KTESTAGENT00000000000000' as ULID,
      contentHash:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as ContentHash,
      text: 'Hello',
    });

    const result = await verifyModelNodeProvenance({
      nodeId: modelNodeId,
      nodeRepository: {
        findById: async () => modelNode,
      },
      edgeRepository: {
        findContinuationsByTargetNodeId: async () => [],
      },
      rawApiResponseRepository: {
        findByNodeId: async () => null,
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('missingRawApiResponse');
  });
});

