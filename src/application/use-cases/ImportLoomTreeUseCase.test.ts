import { describe, expect, it } from '@jest/globals';
import type {
  Agent,
  Edge,
  LoomTree,
  Node,
  UserPreferences,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { CreateLoomTreeInput } from '@application/repositories';
import { ImportLoomTreeUseCase } from './ImportLoomTreeUseCase';

const now = new Date('2026-07-08T12:00:00.000Z');

const sharedModelAgent: Agent = {
  id: '01KSHARED00000000000000000' as ULID,
  name: 'Default Agent',
  type: 'model',
  modelRef: 'openrouter:some/model' as Agent['modelRef'],
  configuration: {},
  permissions: {
    loomAware: false,
    loomWrite: true,
    loomGenerate: false,
    docRead: false,
    docWrite: false,
  },
  createdAt: now,
  updatedAt: now,
};

const userPreferences = {
  autoTitleEnabled: true,
} as unknown as UserPreferences;

const buildFakes = () => {
  const createdNodes: Node[] = [];
  const createdEdges: Edge[] = [];
  const createdTrees: CreateLoomTreeInput[] = [];
  const createdAgents: Agent[] = [];
  const pathNodes: ULID[] = [];
  const metadataUpdates: Array<{ id: ULID; changes: unknown }> = [];
  let pathState: { activeNodeId: ULID } | null = null;

  const useCase = new ImportLoomTreeUseCase({
    loomTreeRepository: {
      create: async (input) => {
        createdTrees.push(input);
        return {
          id: input.id ?? ('01KFALLBACK000000000000000' as ULID),
          groveId: input.groveId,
          title: input.title ?? 'untitled',
          rootNodeId: input.rootNodeId,
          mode: input.mode,
          systemContext: input.systemContext,
          defaultModelAgentId: input.defaultModelAgentId,
          createdAt: now,
          updatedAt: now,
        } as LoomTree;
      },
      hardDelete: async () => true,
    },
    nodeRepository: {
      create: async (input) => {
        const node: Node = {
          id: input.id ?? (`gen-${createdNodes.length}` as ULID),
          localId: input.localId,
          loomTreeId: input.loomTreeId,
          content: input.content,
          authorAgentId: input.authorAgentId,
          authorType: input.authorType,
          contentHash: input.contentHash,
          createdAt: input.createdAt ?? now,
          metadata: { bookmarked: false, pruned: false, excluded: false },
          editedFrom: input.editedFrom,
        };
        createdNodes.push(node);
        return node;
      },
      updateMetadata: async (id, changes) => {
        metadataUpdates.push({ id, changes });
        return createdNodes.find((node) => node.id === id) as Node;
      },
      hardDelete: async () => true,
    },
    edgeRepository: {
      create: async (input) => {
        const edge: Edge = {
          id: `edge-${createdEdges.length}` as ULID,
          loomTreeId: input.loomTreeId,
          sources: input.sources,
          targetNodeId: input.targetNodeId,
          edgeType: input.edgeType,
          createdAt: now,
        };
        createdEdges.push(edge);
        return edge;
      },
    },
    agentRepository: {
      create: async (input) => {
        const agent: Agent = {
          id: `01KIMPORTAGENT${createdAgents.length}00000000`.slice(
            0,
            26
          ) as ULID,
          name: input.name,
          type: input.type,
          modelRef: input.modelRef,
          configuration: input.configuration ?? {},
          permissions: input.permissions ?? sharedModelAgent.permissions,
          ownerTreeId: input.ownerTreeId,
          createdAt: now,
          updatedAt: now,
        };
        createdAgents.push(agent);
        return agent;
      },
      findById: async (id) =>
        id === sharedModelAgent.id ? sharedModelAgent : null,
      findSharedModels: async () => [sharedModelAgent],
    },
    pathRepository: {
      create: async (input) => ({
        id: '01KPATH0000000000000000000' as ULID,
        loomTreeId: input.loomTreeId,
        ownerAgentId: input.ownerAgentId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      }),
      appendNode: async (pathId, nodeId) => {
        pathNodes.push(nodeId);
        return {
          id: `path-node-${pathNodes.length}` as ULID,
          pathId,
          nodeId,
          position: pathNodes.length - 1,
          createdAt: now,
        };
      },
    },
    pathStateRepository: {
      create: async (input) => {
        pathState = { activeNodeId: input.activeNodeId };
        return {
          id: '01KPATHSTATE00000000000000' as ULID,
          pathId: input.pathId,
          agentId: input.agentId,
          mode: input.mode,
          activeNodeId: input.activeNodeId,
          updatedAt: now,
        };
      },
    },
    userPreferencesRepository: {
      get: async () => userPreferences,
      update: async () => userPreferences,
    },
  });

  return {
    useCase,
    createdNodes,
    createdEdges,
    createdTrees,
    createdAgents,
    pathNodes,
    metadataUpdates,
    getPathState: () => pathState,
  };
};

const openLoomV2Fixture = JSON.stringify({
  format: 'open-loom',
  version: '2.0',
  trees: [
    {
      id: 't1',
      title: 'Imported Story',
      mode: 'dialogue',
      systemContext: 'sys',
      rootNodeIds: ['a'],
      currentNodeId: 'c',
      nodes: {
        a: {
          id: 'a',
          content: [{ type: 'text', text: 'root' }],
          author: { role: 'human' },
          createdAt: '2025-01-01T00:00:00Z',
        },
        b: {
          id: 'b',
          content: [{ type: 'text', text: 'branch b' }],
          author: { role: 'model' },
          generation: { model: 'some/model' },
          meta: { bookmarked: true, bookmarkLabel: 'fav' },
        },
        c: {
          id: 'c',
          content: [{ type: 'text', text: 'branch c' }],
          author: { role: 'model' },
          generation: { model: 'some/model' },
        },
      },
      edges: [
        {
          type: 'continuation',
          sources: [{ nodeId: 'a' }],
          targetNodeId: 'b',
        },
        {
          type: 'continuation',
          sources: [{ nodeId: 'a' }],
          targetNodeId: 'c',
        },
      ],
    },
  ],
});

describe('ImportLoomTreeUseCase', () => {
  it('imports an Open Loom v2 document with remapped ids and rebuilt path', async () => {
    const fakes = buildFakes();

    const result = await fakes.useCase.execute({
      groveId: '01KGROVE000000000000000000' as ULID,
      ownerAgentId: '01KOWNER000000000000000000' as ULID,
      raw: openLoomV2Fixture,
    });

    expect(result.sourceFormat).toBe('open-loom-v2');
    expect(result.trees).toHaveLength(1);
    expect(result.trees[0].title).toBe('Imported Story');
    expect(result.trees[0].nodeCount).toBe(3);

    // IDs re-minted: none of the source ids survive.
    expect(fakes.createdNodes.map((node) => node.id)).not.toContain('a');

    // Topology: two continuation edges from the (new) root.
    expect(fakes.createdEdges).toHaveLength(2);
    const rootId = fakes.createdTrees[0].rootNodeId;
    for (const edge of fakes.createdEdges) {
      expect(edge.sources[0].nodeId).toBe(rootId);
    }

    // Human nodes attribute to the importer; model nodes to one
    // tree-owned placeholder agent named after the source model.
    const humanNode = fakes.createdNodes.find((n) => n.authorType === 'human');
    expect(humanNode?.authorAgentId).toBe('01KOWNER000000000000000000');
    expect(fakes.createdAgents).toHaveLength(1);
    expect(fakes.createdAgents[0].ownerTreeId).toBe(fakes.createdTrees[0].id);
    expect(fakes.createdAgents[0].name).toContain('some/model');

    // Original timestamps preserved.
    expect(humanNode?.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');

    // Bookmark metadata restored.
    expect(fakes.metadataUpdates).toHaveLength(1);

    // Path follows root → currentNodeId ('c'); cursor lands on 'c'.
    expect(fakes.pathNodes).toHaveLength(2);
    expect(fakes.getPathState()?.activeNodeId).toBe(fakes.pathNodes[1]);

    // Tree wired to the resolved default model agent.
    expect(fakes.createdTrees[0].defaultModelAgentId).toBe(sharedModelAgent.id);
    expect(fakes.createdTrees[0].systemContext).toBe('sys');
  });

  it('imports an Open Loom v1 (Loom Swift) file with distinct localIds', async () => {
    const fakes = buildFakes();
    // Enough nodes that same-millisecond ULID minting would exhaust the
    // 6-8 char candidate space if localIds were still timestamp-prefixed.
    const nodeCount = 12;
    const nodes: Record<string, unknown> = {};
    const rootChildren: string[] = [];
    nodes['root'] = {
      text: 'root prompt',
      author: 'user',
      createdTime: 700000000, // Swift reference-date seconds
      childrenIds: rootChildren,
    };
    for (let i = 0; i < nodeCount - 1; i++) {
      const id = `child-${i}`;
      rootChildren.push(id);
      nodes[id] = {
        text: `continuation ${i}`,
        author: 'assistant',
        modelId: 'legacy/model',
        parentId: 'root',
        childrenIds: [],
      };
    }
    const v1Fixture = JSON.stringify({
      title: 'Legacy Tree',
      rootNodeId: 'root',
      currentNodeId: 'child-0',
      bookmarkedNodes: {},
      nodes,
    });

    const result = await fakes.useCase.execute({
      groveId: '01KGROVE000000000000000000' as ULID,
      ownerAgentId: '01KOWNER000000000000000000' as ULID,
      raw: v1Fixture,
    });

    expect(result.sourceFormat).toBe('open-loom-v1');
    expect(result.trees[0].title).toBe('Legacy Tree');
    expect(result.trees[0].nodeCount).toBe(nodeCount);

    // Every node got a unique localId despite batch ULID minting.
    const localIds = fakes.createdNodes.map((node) => node.localId);
    expect(new Set(localIds).size).toBe(nodeCount);

    // v1 author/model mapping survived normalization.
    const modelNodes = fakes.createdNodes.filter(
      (node) => node.authorType === 'model'
    );
    expect(modelNodes).toHaveLength(nodeCount - 1);
    expect(fakes.createdAgents[0].name).toContain('legacy/model');
  });

  it('synthesizes a root for multi-root trees', async () => {
    const fakes = buildFakes();
    const multiRoot = JSON.stringify({
      format: 'open-loom',
      version: '2.0',
      trees: [
        {
          id: 't1',
          title: 'Multi Root',
          rootNodeIds: ['a', 'b'],
          nodes: {
            a: {
              id: 'a',
              content: [{ type: 'text', text: 'first root' }],
              author: { role: 'human' },
            },
            b: {
              id: 'b',
              content: [{ type: 'text', text: 'second root' }],
              author: { role: 'human' },
            },
          },
          edges: [],
        },
      ],
    });

    const result = await fakes.useCase.execute({
      groveId: '01KGROVE000000000000000000' as ULID,
      ownerAgentId: '01KOWNER000000000000000000' as ULID,
      raw: multiRoot,
    });

    // 2 source nodes + 1 synthetic root.
    expect(result.trees[0].nodeCount).toBe(3);
    expect(fakes.createdEdges).toHaveLength(2);
    const rootId = fakes.createdTrees[0].rootNodeId;
    const rootNode = fakes.createdNodes.find((node) => node.id === rootId);
    expect(rootNode?.content).toEqual({ type: 'text', text: '' });
  });
});
