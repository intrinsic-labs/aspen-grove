import type {
  IPathRepository,
  IPathStateRepository,
} from '@application/repositories';
import type {
  Agent,
  Edge,
  LoomTree,
  Node,
  Path,
  RawApiResponse,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { GenerateParallelContinuationsDependencies } from '../GenerateParallelContinuationsUseCase';

/** Test fixture: a two-node dialogue tree held in memory. */
export const now = new Date('2026-11-09T12:00:00.000Z');
export const ownerAgentId = '01KOWNER000000000000000000' as ULID;
export const modelAgentId = '01KMODEL000000000000000000' as ULID;
export const treeId = '01KTREE0000000000000000000' as ULID;
export const pathId = '01KPATH0000000000000000000' as ULID;
export const rootNodeId = '01KROOT0000000000000000000' as ULID;
export const sourceNodeId = '01KSOURCE00000000000000000' as ULID;

const humanNode = (id: ULID, text: string, hashChar: string): Node => ({
  id,
  localId: id.slice(-6) as Node['localId'],
  loomTreeId: treeId,
  content: { type: 'text', text },
  authorAgentId: ownerAgentId,
  authorType: 'human',
  contentHash: hashChar.repeat(64) as Node['contentHash'],
  createdAt: now,
  metadata: { bookmarked: false, pruned: false, excluded: false },
});

const modelAgent: Agent = {
  id: modelAgentId,
  name: 'Test model',
  type: 'model',
  modelRef: 'openrouter:test/model' as Agent['modelRef'],
  configuration: { systemPrompt: 'Be brief.', temperature: 1 },
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

export type InMemoryDialogueStore = ReturnType<typeof createInMemoryDialogueStore>;

/**
 * Repositories over plain maps, plus a log of every node write so tests can
 * see exactly what was persisted and when.
 */
export const createInMemoryDialogueStore = () => {
  const nodes = new Map<ULID, Node>([
    [rootNodeId, humanNode(rootNodeId, 'Tell me a story.', 'a')],
    [sourceNodeId, humanNode(sourceNodeId, 'Make it short.', 'b')],
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
  ];
  const rawResponses = new Map<ULID, RawApiResponse>();
  const createdNodeTexts: string[] = [];
  let touchCount = 0;
  let pathNodeIds: ULID[] = [rootNodeId, sourceNodeId];
  let activeNodeId: ULID = sourceNodeId;
  const toPathNodes = () =>
    pathNodeIds.map((nodeId, position) => ({
      id: `path-node-${position}` as ULID,
      pathId,
      position,
      nodeId,
      createdAt: now,
    }));

  const repositories: Omit<
    GenerateParallelContinuationsDependencies,
    'providerRegistry' | 'retry' | 'pathRepository'
  > & {
    readonly pathRepository: Pick<
      IPathRepository,
      'findById' | 'getNodeSequence' | 'appendNode' | 'replaceSuffix'
    >;
    readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
  } = {
    agentRepository: {
      findById: async (id) => (id === modelAgentId ? modelAgent : null),
    },
    loomTreeRepository: {
      findById: async (id) => (id === treeId ? tree : null),
      touchLastMessage: async () => {
        touchCount += 1;
      },
    },
    nodeRepository: {
      findById: async (id) => nodes.get(id) ?? null,
      create: async (input) => {
        const node: Node = {
          id: input.id as ULID,
          localId: input.localId,
          loomTreeId: input.loomTreeId,
          content: input.content,
          authorAgentId: input.authorAgentId,
          authorType: input.authorType,
          contentHash: input.contentHash,
          createdAt: input.createdAt ?? now,
          metadata: { bookmarked: false, pruned: false, excluded: false },
        };
        nodes.set(node.id, node);
        createdNodeTexts.push(
          node.content.type === 'text' ? node.content.text : ''
        );
        return node;
      },
      getAllLocalIds: async () =>
        new Set(Array.from(nodes.values()).map((node) => node.localId)),
      hardDelete: async (id) => nodes.delete(id),
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
        if (index >= 0) {
          edges.splice(index, 1);
        }
        return index >= 0;
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
      getNodeSequence: async () => toPathNodes(),
      appendNode: async (_pathId, nodeId) => {
        pathNodeIds = [...pathNodeIds, nodeId];
        return toPathNodes()[pathNodeIds.length - 1];
      },
      replaceSuffix: async (_pathId, startPosition, nodeIds) => {
        pathNodeIds = [...pathNodeIds.slice(0, startPosition), ...nodeIds];
      },
    },
    pathStateRepository: {
      setActiveNode: async (_pathId, agentId, nodeId, mode) => {
        activeNodeId = nodeId;
        return {
          id: 'path-state' as ULID,
          pathId,
          agentId,
          mode: mode ?? 'dialogue',
          activeNodeId: nodeId,
          updatedAt: now,
        };
      },
    },
    rawApiResponseRepository: {
      create: async (input) => {
        const raw: RawApiResponse = {
          ...input,
          id: `raw-${input.nodeId}` as ULID,
          compressionType: 'none',
          createdAt: now,
        };
        rawResponses.set(input.nodeId, raw);
        return raw;
      },
      findByNodeId: async (nodeId) => rawResponses.get(nodeId) ?? null,
      deleteByNodeId: async (nodeId) => rawResponses.delete(nodeId),
    },
  };

  return {
    repositories,
    nodes,
    edges,
    rawResponses,
    createdNodeTexts,
    touchCount: () => touchCount,
    pathNodeIds: () => pathNodeIds,
    activeNodeId: () => activeNodeId,
    childrenOfSource: () =>
      edges
        .filter((edge) =>
          edge.sources.some((source) => source.nodeId === sourceNodeId)
        )
        .map((edge) => edge.targetNodeId),
  };
};
