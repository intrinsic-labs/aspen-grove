import { describe, expect, it } from '@jest/globals';
import { computeSha256Hash } from '@application/services/content-hash-service';
import type {
  Agent,
  Edge,
  LoomTree,
  Node,
  RawApiResponse,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { SendDialogueTurnUseCase } from './SendDialogueTurnUseCase';

const now = new Date('2026-02-23T12:00:00.000Z');

const createNode = (input: {
  id: ULID;
  authorType: 'human' | 'model';
  authorAgentId: ULID;
  contentHash: string;
  text: string;
  localId: string;
}): Node => ({
  id: input.id,
  localId: input.localId as Node['localId'],
  loomTreeId: '01KCASE000000000000000TREE' as ULID,
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

describe('SendDialogueTurnUseCase', () => {
  it('commits user node before completion and persists provenance evidence', async () => {
    const ownerAgentId = '01KOWNER000000000000000000' as ULID;
    const modelAgentId = '01KMODEL000000000000000000' as ULID;
    const treeId = '01KTREE0000000000000000000' as ULID;
    const pathId = '01KPATH0000000000000000000' as ULID;
    const rootNodeId = '01KROOT0000000000000000000' as ULID;

    const rootNode = createNode({
      id: rootNodeId,
      authorType: 'human',
      authorAgentId: ownerAgentId,
      contentHash:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      text: 'Hello Aspen Grove.',
      localId: 'root001',
    });

    const nodesById = new Map<ULID, Node>([[rootNode.id, rootNode]]);
    const pathNodeIds: ULID[] = [rootNode.id];
    const edges: Edge[] = [];
    const rawResponsesByNodeId = new Map<ULID, RawApiResponse>();

    let completionRequested = false;
    let callbackHappenedBeforeCompletion = false;

    const responseHeaders = 'x-request-id: req_turn_1\ncontent-type: application/json';
    const responseBody =
      '{"id":"resp_1","model":"anthropic/claude-haiku-4.5","choices":[{"finish_reason":"stop","message":{"content":"Assistant reply"}}],"usage":{"prompt_tokens":10,"completion_tokens":12,"total_tokens":22}}';
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
      systemContext: 'Tree system context',
    };

    const useCase = new SendDialogueTurnUseCase({
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
        appendNode: async (pathInputId, nodeId) => {
          pathNodeIds.push(nodeId);
          return {
            id: `path-node-${pathNodeIds.length}` as ULID,
            pathId: pathInputId,
            nodeId,
            position: pathNodeIds.length - 1,
            createdAt: now,
          };
        },
        getNodeSequence: async (pathInputId) =>
          pathNodeIds.map((nodeId, index) => ({
            id: `path-node-${index + 1}` as ULID,
            pathId: pathInputId,
            nodeId,
            position: index,
            createdAt: now,
          })),
      },
      pathStateRepository: {
        setActiveNode: async (pathInputId, agentId, activeNodeId, mode) => ({
          id: `path-state-${pathInputId}` as ULID,
          pathId: pathInputId,
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
        generateCompletion: async () => {
          completionRequested = true;
          return {
            content: 'Assistant reply',
            finishReason: 'stop',
            usage: {
              promptTokens: 10,
              completionTokens: 12,
              totalTokens: 22,
            },
            rawResponse: {
              rawBytes: `${responseHeaders}\n\n${responseBody}`,
              rawBytesHash,
              requestTimestamp: now,
              responseTimestamp: now,
              latencyMs: 1000,
              requestId: 'req_turn_1',
              modelIdentifier: 'anthropic/claude-haiku-4.5',
              responseBody,
              responseHeaders,
            },
          };
        },
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
        activeNodeId: rootNodeId,
      },
      prompt: 'What is a loom interface?',
      providerApiKey: 'sk-or-test',
      onUserNodeCommitted: async () => {
        callbackHappenedBeforeCompletion = !completionRequested;
      },
    });

    expect(callbackHappenedBeforeCompletion).toBe(true);
    expect(result.userNodeId).toBeDefined();
    expect(result.assistantNodeId).toBeDefined();
    expect(result.completion.finishReason).toBe('stop');
    expect(result.provenance.rawApiResponseId).toBeDefined();
    expect(rawResponsesByNodeId.has(result.assistantNodeId)).toBe(true);
    expect(pathNodeIds[pathNodeIds.length - 1]).toBe(result.assistantNodeId);
  });
});
