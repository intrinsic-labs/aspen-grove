import { describe, expect, it, jest } from '@jest/globals';
import { computeSha256Hash } from '@application/services/content-hash-service';
import type {
  Agent,
  Edge,
  LoomTree,
  Node,
  Path,
  RawApiResponse,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { GenerateDialogueContinuationUseCase } from './GenerateDialogueContinuationUseCase';

const now = new Date('2026-02-24T12:00:00.000Z');

const createNode = (input: {
  id: ULID;
  loomTreeId: ULID;
  authorType: 'human' | 'model';
  authorAgentId: ULID;
  contentHash: string;
  text: string;
  localId: string;
}): Node => ({
  id: input.id,
  localId: input.localId as Node['localId'],
  loomTreeId: input.loomTreeId,
  content: { type: 'text', text: input.text },
  authorAgentId: input.authorAgentId,
  authorType: input.authorType,
  contentHash: input.contentHash as Node['contentHash'],
  createdAt: now,
  metadata: {
    bookmarked: false,
    pruned: false,
    excluded: false,
  },
});

describe('GenerateDialogueContinuationUseCase', () => {
  it('generates a sibling continuation from an existing source node and activates path', async () => {
    const ownerAgentId = '01KOWNER000000000000000000' as ULID;
    const modelAgentId = '01KMODEL000000000000000000' as ULID;
    const treeId = '01KTREE0000000000000000000' as ULID;
    const pathId = '01KPATH0000000000000000000' as ULID;
    const rootNodeId = '01KROOT0000000000000000000' as ULID;
    const sourceNodeId = '01KSOURCE00000000000000000' as ULID;
    const existingAssistantId = '01KEXISTING00000000000000' as ULID;

    const rootNode = createNode({
      id: rootNodeId,
      loomTreeId: treeId,
      authorType: 'human',
      authorAgentId: ownerAgentId,
      contentHash:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      text: 'Hello Aspen Grove.',
      localId: 'root001',
    });

    const sourceNode = createNode({
      id: sourceNodeId,
      loomTreeId: treeId,
      authorType: 'human',
      authorAgentId: ownerAgentId,
      contentHash:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      text: 'Give me another response',
      localId: 'source01',
    });

    const existingAssistant = createNode({
      id: existingAssistantId,
      loomTreeId: treeId,
      authorType: 'model',
      authorAgentId: modelAgentId,
      contentHash:
        'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      text: 'Existing assistant response',
      localId: 'assist01',
    });

    const nodesById = new Map<ULID, Node>([
      [rootNodeId, rootNode],
      [sourceNodeId, sourceNode],
      [existingAssistantId, existingAssistant],
    ]);
    const edges: Edge[] = [
      {
        id: '01KEDGE0000000000000000001' as ULID,
        loomTreeId: treeId,
        sources: [{ nodeId: rootNodeId, role: 'primary' }],
        targetNodeId: sourceNodeId,
        edgeType: 'continuation',
        createdAt: now,
      },
      {
        id: '01KEDGE0000000000000000002' as ULID,
        loomTreeId: treeId,
        sources: [{ nodeId: sourceNodeId, role: 'primary' }],
        targetNodeId: existingAssistantId,
        edgeType: 'continuation',
        createdAt: now,
      },
    ];
    const rawResponsesByNodeId = new Map<ULID, RawApiResponse>();
    const pathNodeIds: ULID[] = [rootNodeId, sourceNodeId, existingAssistantId];

    const responseHeaders = 'x-request-id: req_branch_1\ncontent-type: application/json';
    const responseBody =
      '{"id":"resp_branch_1","model":"anthropic/claude-haiku-4.5","choices":[{"finish_reason":"stop","message":{"content":"Alternative assistant response"}}],"usage":{"prompt_tokens":12,"completion_tokens":11,"total_tokens":23}}';
    const rawBytesHash = await computeSha256Hash(
      `${responseHeaders}\n\n${responseBody}`
    );

    const modelAgent: Agent = {
      id: modelAgentId,
      name: 'OpenRouter Assistant',
      type: 'model',
      modelRef: 'openrouter:anthropic/claude-haiku-4.5' as Agent['modelRef'],
      configuration: {
        systemPrompt: 'You are helpful.',
        temperature: 1,
      },
      permissions: {
        loomAware: false,
        loomWrite: true,
        loomGenerate: false,
        docRead: true,
        docWrite: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    const tree: LoomTree = {
      id: treeId,
      groveId: '01KGROVE000000000000000000' as ULID,
      title: 'Tree',
      rootNodeId,
      mode: 'dialogue',
      createdAt: now,
      updatedAt: now,
      systemContext: '',
    };

    const path: Path = {
      id: pathId,
      loomTreeId: treeId,
      ownerAgentId,
      name: 'Main',
      createdAt: now,
      updatedAt: now,
    };

    const replaceSuffix = jest.fn<
      (replacePathId: ULID, startPosition: number, nodeIds: readonly ULID[]) => Promise<void>
    >(async (replacePathId, startPosition, nodeIds) => {
      expect(replacePathId).toBe(pathId);
      pathNodeIds.splice(startPosition, pathNodeIds.length - startPosition, ...nodeIds);
    });

    const useCase = new GenerateDialogueContinuationUseCase({
      agentRepository: {
        findById: async (id) => (id === modelAgentId ? modelAgent : null),
      },
      loomTreeRepository: {
        findById: async (id) => (id === treeId ? tree : null),
      },
      nodeRepository: {
        findById: async (id) => nodesById.get(id) ?? null,
        create: async (input) => {
          const node = createNode({
            id: input.id ?? ('01KGENERATED00000000000000' as ULID),
            loomTreeId: input.loomTreeId,
            authorType: input.authorType,
            authorAgentId: input.authorAgentId,
            contentHash: input.contentHash,
            text: input.content.type === 'text' ? input.content.text : '[non-text]',
            localId: String(input.localId),
          });
          nodesById.set(node.id, node);
          return node;
        },
        getAllLocalIds: async () =>
          new Set(Array.from(nodesById.values()).map((node) => node.localId)),
        hardDelete: async (id) => nodesById.delete(id),
      },
      edgeRepository: {
        create: async (input) => {
          const edge: Edge = {
            id: `edge-${edges.length + 1}` as ULID,
            loomTreeId: input.loomTreeId,
            sources: input.sources,
            targetNodeId: input.targetNodeId,
            edgeType: input.edgeType,
            createdAt: now,
          };
          edges.push(edge);
          return edge;
        },
        delete: async (id) => {
          const index = edges.findIndex((edge) => edge.id === id);
          if (index < 0) {
            return false;
          }
          edges.splice(index, 1);
          return true;
        },
        findContinuationsByTargetNodeId: async (targetNodeId) =>
          edges.filter(
            (edge) =>
              edge.targetNodeId === targetNodeId &&
              edge.edgeType === 'continuation'
          ),
      },
      pathRepository: {
        findById: async (id) => (id === pathId ? path : null),
        getNodeSequence: async (sequencePathId) =>
          pathNodeIds.map((nodeId, index) => ({
            id: `path-node-${index + 1}` as ULID,
            pathId: sequencePathId,
            nodeId,
            position: index,
            createdAt: now,
          })),
        replaceSuffix,
      },
      pathStateRepository: {
        setActiveNode: async (pathStateId, agentId, activeNodeId, mode) => ({
          id: `path-state-${pathStateId}` as ULID,
          pathId: pathStateId,
          agentId,
          activeNodeId,
          mode,
          updatedAt: now,
        }),
      },
      rawApiResponseRepository: {
        create: async (input) => {
          const raw: RawApiResponse = {
            id: `raw-${input.nodeId}` as ULID,
            nodeId: input.nodeId,
            provider: input.provider,
            requestId: input.requestId,
            modelIdentifier: input.modelIdentifier,
            responseBody: input.responseBody,
            responseHeaders: input.responseHeaders,
            requestTimestamp: input.requestTimestamp,
            responseTimestamp: input.responseTimestamp,
            latencyMs: input.latencyMs,
            tokenUsage: input.tokenUsage,
            compressionType: 'none',
            createdAt: now,
          };
          rawResponsesByNodeId.set(input.nodeId, raw);
          return raw;
        },
        findByNodeId: async (nodeId) => rawResponsesByNodeId.get(nodeId) ?? null,
        deleteByNodeId: async (nodeId) => rawResponsesByNodeId.delete(nodeId),
      },
      llmProvider: {
        provider: 'openrouter',
        initialize: async () => true,
        getCapabilities: () => ({
          supportsStreaming: false,
          supportsSystemPrompt: true,
          supportedModels: ['anthropic/claude-haiku-4.5'],
        }),
        generateCompletion: async () => ({
          content: 'Alternative assistant response',
          finishReason: 'stop',
          usage: {
            promptTokens: 12,
            completionTokens: 11,
            totalTokens: 23,
          },
          rawResponse: {
            rawBytes: `${responseHeaders}\n\n${responseBody}`,
            rawBytesHash,
            requestTimestamp: now,
            responseTimestamp: now,
            latencyMs: 900,
            requestId: 'req_branch_1',
            modelIdentifier: 'anthropic/claude-haiku-4.5',
            responseBody,
            responseHeaders,
          },
        }),
        generateStreamingCompletion: async function* () {
          return;
        },
      },
    });

    const result = await useCase.execute({
      session: {
        ownerAgentId,
        modelAgentId,
        modelIdentifier: 'anthropic/claude-haiku-4.5',
        treeId,
        pathId,
      },
      sourceNodeId,
      providerApiKey: 'sk-or-test',
      activateGeneratedNode: true,
    });

    expect(result.sourceNodeId).toBe(sourceNodeId);
    expect(result.assistantNodeId).toBeDefined();
    expect(result.activatedPath).toBe(true);
    expect(result.provenance.rawApiResponseId).toBeDefined();
    expect(rawResponsesByNodeId.has(result.assistantNodeId)).toBe(true);

    expect(replaceSuffix).toHaveBeenCalledTimes(1);
    expect(pathNodeIds[pathNodeIds.length - 1]).toBe(result.assistantNodeId);
  });
});
