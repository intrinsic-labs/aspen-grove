import { describe, expect, it, jest } from '@jest/globals';
import {
  computeModelContentHash,
  computeSha256Hash,
} from '@application/services/content-hash-service';
import * as hashService from '@application/services/content-hash-service';
import type {
  BufferNodeInfo,
  Edge,
  Node,
  RawApiResponse,
} from '@domain/entities';
import type { ContentHash, ULID } from '@domain/value-objects';
import { verifyModelNodeProvenance } from './verify-model-node-provenance';

const now = new Date('2026-02-23T10:00:00.000Z');

const createNode = (input: {
  id: ULID;
  authorType: 'human' | 'model';
  authorAgentId: ULID;
  contentHash: ContentHash;
  text: string;
  buffer?: BufferNodeInfo;
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
    ...(input.buffer ? { buffer: input.buffer } : {}),
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

    const responseHeaders =
      'x-request-id: req_123\ncontent-type: application/json';
    const responseBody =
      '{"id":"resp_123","choices":[{"message":{"content":"Hello"}}]}';
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

  it('uses the immutable buffer creation parent and rejects tampered evidence or membership', async () => {
    const sha = jest
      .spyOn(hashService, 'computeSha256Hash')
      .mockImplementation(async (payload) => payload as ContentHash);
    const modelHash = jest
      .spyOn(hashService, 'computeModelContentHash')
      .mockImplementation(
        async (_content, parents, _createdAt, _author, raw) =>
          `${parents.join(',')}|${raw}` as ContentHash
      );
    const originalId = '01KBUFFERPARENT000000000000' as ULID;
    const editedId = '01KBUFFEREDITED000000000000' as ULID;
    const modelId = '01KBUFFERMODEL0000000000000' as ULID;
    const agentId = '01KBUFFERAGENT0000000000000' as ULID;
    const originalHash = '1'.repeat(64) as ContentHash;
    const editedHash = '2'.repeat(64) as ContentHash;
    const headers = 'x-request-id: buffer';
    const body = '{"text":"child"}';
    const rawHash = await computeSha256Hash(`${headers}\n\n${body}`);
    const contentHash = await computeModelContentHash(
      { type: 'text', text: 'child' },
      [originalHash],
      now,
      agentId,
      rawHash
    );
    const nodes = new Map<ULID, Node>([
      [
        originalId,
        createNode({
          id: originalId,
          authorType: 'human',
          authorAgentId: agentId,
          contentHash: originalHash,
          text: 'original',
        }),
      ],
      [
        editedId,
        createNode({
          id: editedId,
          authorType: 'human',
          authorAgentId: agentId,
          contentHash: editedHash,
          text: 'edited twice',
        }),
      ],
      [
        modelId,
        createNode({
          id: modelId,
          authorType: 'model',
          authorAgentId: agentId,
          contentHash,
          text: 'child',
          buffer: { creationParentId: originalId, drawId: modelId, slot: 0 },
        }),
      ],
    ]);
    const edge: Edge = {
      id: '01KBUFFEREDGE00000000000000' as ULID,
      loomTreeId: nodes.get(modelId)!.loomTreeId,
      sources: [originalId, editedId].map((nodeId) => ({
        nodeId,
        role: 'primary' as const,
      })),
      targetNodeId: modelId,
      edgeType: 'continuation',
      createdAt: now,
    };
    const raw: RawApiResponse = {
      id: '01KBUFFERRAW000000000000000' as ULID,
      nodeId: modelId,
      provider: 'lmstudio',
      modelIdentifier: 'base',
      responseBody: body,
      responseHeaders: headers,
      requestTimestamp: now,
      responseTimestamp: now,
      latencyMs: 10,
      compressionType: 'gzip',
      createdAt: now,
    };
    const verify = (candidateEdge: Edge, candidateRaw: RawApiResponse = raw) =>
      verifyModelNodeProvenance({
        nodeId: modelId,
        nodeRepository: { findById: async (id) => nodes.get(id) ?? null },
        edgeRepository: {
          findContinuationsByTargetNodeId: async () => [candidateEdge],
        },
        rawApiResponseRepository: {
          findByNodeId: async () => candidateRaw,
        },
      });

    await expect(verify(edge)).resolves.toMatchObject({
      isValid: true,
      parentNodeCount: 1,
    });
    await expect(
      verify(edge, { ...raw, responseBody: '{"tampered":true}' })
    ).resolves.toMatchObject({ isValid: false, status: 'hashMismatch' });
    await expect(
      verify({ ...edge, sources: edge.sources.slice(1) })
    ).resolves.toMatchObject({
      isValid: false,
      status: 'creationParentMismatch',
    });
    sha.mockRestore();
    modelHash.mockRestore();
  });
});
