import { describe, expect, it } from '@jest/globals';
import type {
  CreateAgentInput,
  UpdateAgentInput,
} from '@application/repositories';
import type { Agent, LoomTree } from '@domain/entities';
import { parseModelRef, type ULID } from '@domain/value-objects';
import { UpdateTreeModelSettingsUseCase } from './UpdateTreeModelSettingsUseCase';

const now = new Date('2026-11-11T12:00:00.000Z');
const treeId = '01KTREE0000000000000000000' as ULID;
const otherTreeId = '01KTREE0000000000000000001' as ULID;
const sharedId = '01KAGENTSHARED000000000000' as ULID;
const ownedId = '01KAGENTOWNED0000000000000' as ULID;
const mockRef = parseModelRef('lmstudio:mock-model');

const makeTree = (id: ULID, defaultModelAgentId?: ULID): LoomTree => ({
  id,
  groveId: '01KGROVE000000000000000000' as ULID,
  title: id === treeId ? 'Ancient Trees' : 'Other',
  rootNodeId: '01KROOT0000000000000000000' as ULID,
  mode: 'dialogue',
  defaultModelAgentId,
  createdAt: now,
  updatedAt: now,
});

const makeAgent = (id: ULID, ownerTreeId?: ULID): Agent => ({
  id,
  name: 'Mock',
  type: 'model',
  modelRef: mockRef,
  configuration: { systemPrompt: 'Be brief.', temperature: 1, maxTokens: 4096 },
  permissions: {
    loomAware: false,
    loomWrite: true,
    loomGenerate: false,
  },
  ownerTreeId,
  createdAt: now,
  updatedAt: now,
});

/** In-memory agents and trees; records what the use case writes. */
const build = (input: {
  readonly agents: readonly Agent[];
  readonly trees: readonly LoomTree[];
}) => {
  const agents = new Map(input.agents.map((agent) => [agent.id, agent]));
  const trees = new Map(input.trees.map((tree) => [tree.id, tree]));
  const created: CreateAgentInput[] = [];
  let nextId = 0;

  const useCase = new UpdateTreeModelSettingsUseCase({
    agentRepository: {
      findById: async (id) => agents.get(id) ?? null,
      create: async (create) => {
        created.push(create);
        const agent: Agent = {
          ...makeAgent(`01KAGENTNEW00000000000000${nextId++}` as ULID),
          ...create,
          configuration: create.configuration ?? {},
          permissions: create.permissions ?? makeAgent(sharedId).permissions,
        };
        agents.set(agent.id, agent);
        return agent;
      },
      update: async ({ id, changes }: UpdateAgentInput) => {
        const existing = agents.get(id);
        if (!existing) {
          throw new Error('missing');
        }
        const updated: Agent = {
          ...existing,
          name: changes.name ?? existing.name,
          modelRef: changes.modelRef ?? existing.modelRef,
          configuration: changes.configuration ?? existing.configuration,
        };
        agents.set(id, updated);
        return updated;
      },
    },
    loomTreeRepository: {
      findById: async (id) => trees.get(id) ?? null,
      update: async ({ id, changes }) => {
        const updated = { ...trees.get(id)!, ...changes };
        trees.set(id, updated);
        return updated;
      },
      findByDefaultModelAgentId: async (agentId) =>
        [...trees.values()].filter(
          (tree) => tree.defaultModelAgentId === agentId
        ),
    },
  });
  return { useCase, agents, trees, created };
};

describe('UpdateTreeModelSettingsUseCase', () => {
  it('forks a shared agent for the tree and leaves the shared one alone', async () => {
    const { useCase, agents, trees, created } = build({
      agents: [makeAgent(sharedId)],
      trees: [makeTree(treeId, sharedId), makeTree(otherTreeId, sharedId)],
    });

    const result = await useCase.execute({
      treeId,
      changes: { temperature: 0.3 },
    });

    expect(result.forked).toBe(true);
    expect(created).toHaveLength(1);
    expect(result.agent.name).toBe('Mock');
    expect(result.agent.ownerTreeId).toBe(treeId);
    expect(result.agent.configuration).toEqual({
      systemPrompt: 'Be brief.',
      temperature: 0.3,
      maxTokens: 4096,
    });
    // Only this tree moved to the copy.
    expect(trees.get(treeId)?.defaultModelAgentId).toBe(result.agent.id);
    expect(trees.get(otherTreeId)?.defaultModelAgentId).toBe(sharedId);
    expect(agents.get(sharedId)?.configuration.temperature).toBe(1);
  });

  it('forks a library agent even when no other tree uses it yet', async () => {
    const { useCase, agents, created } = build({
      agents: [makeAgent(sharedId)],
      trees: [makeTree(treeId, sharedId)],
    });

    const result = await useCase.execute({
      treeId,
      changes: { modelRef: parseModelRef('openrouter:openai/gpt-4o') },
    });

    expect(result.forked).toBe(true);
    expect(created).toHaveLength(1);
    expect(result.agent.modelRef).toBe('openrouter:openai/gpt-4o');
    expect(agents.get(sharedId)?.modelRef).toBe(mockRef);
  });

  it("edits the tree's own agent in place", async () => {
    const { useCase, trees, created } = build({
      agents: [makeAgent(ownedId, treeId)],
      trees: [makeTree(treeId, ownedId)],
    });

    const result = await useCase.execute({
      treeId,
      changes: { maxTokens: 8192, useMaxTokens: true },
    });

    expect(result.forked).toBe(false);
    expect(created).toHaveLength(0);
    expect(result.agent.id).toBe(ownedId);
    expect(result.agent.configuration).toMatchObject({
      maxTokens: 8192,
      useMaxTokens: true,
      temperature: 1,
    });
    expect(trees.get(treeId)?.defaultModelAgentId).toBe(ownedId);
  });

  it('forks an owned agent that another tree also points at', async () => {
    const { useCase, trees } = build({
      agents: [makeAgent(ownedId, treeId)],
      trees: [makeTree(treeId, ownedId), makeTree(otherTreeId, ownedId)],
    });

    const result = await useCase.execute({
      treeId,
      changes: { temperature: 0 },
    });

    expect(result.forked).toBe(true);
    expect(trees.get(otherTreeId)?.defaultModelAgentId).toBe(ownedId);
  });

  it('keeps both of two overlapping edits to a shared agent, forking once', async () => {
    const { useCase, agents, trees, created } = build({
      agents: [makeAgent(sharedId)],
      trees: [makeTree(treeId, sharedId)],
    });

    await Promise.all([
      useCase.execute({ treeId, changes: { temperature: 0.2 } }),
      useCase.execute({ treeId, changes: { maxTokens: 1024 } }),
    ]);

    expect(created).toHaveLength(1);
    const forkId = trees.get(treeId)?.defaultModelAgentId as ULID;
    expect(agents.get(forkId)?.configuration).toMatchObject({
      temperature: 0.2,
      maxTokens: 1024,
    });
    expect(agents.get(sharedId)?.configuration.temperature).toBe(1);
  });

  it("keeps both of two overlapping edits to the tree's own agent", async () => {
    const { useCase, agents } = build({
      agents: [makeAgent(ownedId, treeId)],
      trees: [makeTree(treeId, ownedId)],
    });

    await Promise.all([
      useCase.execute({ treeId, changes: { temperature: 0.2 } }),
      useCase.execute({ treeId, changes: { maxTokens: 1024 } }),
    ]);

    expect(agents.get(ownedId)?.configuration).toMatchObject({
      temperature: 0.2,
      maxTokens: 1024,
    });
  });

  it('goes on with the next edit for a tree after one fails', async () => {
    const { useCase, created } = build({
      agents: [],
      trees: [makeTree(treeId)],
    });

    const [failed, saved] = await Promise.allSettled([
      useCase.execute({ treeId, changes: { temperature: 0 } }),
      useCase.execute({ treeId, changes: { modelRef: mockRef } }),
    ]);

    expect(failed.status).toBe('rejected');
    expect(saved.status).toBe('fulfilled');
    expect(created).toHaveLength(1);
  });

  it('makes an agent for a tree that has none, once a model is chosen', async () => {
    const { useCase, trees } = build({
      agents: [],
      trees: [makeTree(treeId)],
    });

    await expect(
      useCase.execute({ treeId, changes: { temperature: 0.5 } })
    ).rejects.toThrow('Choose a model');

    const result = await useCase.execute({
      treeId,
      changes: { modelRef: mockRef },
    });
    expect(result.agent.name).toBe('mock-model');
    expect(result.agent.ownerTreeId).toBe(treeId);
    expect(trees.get(treeId)?.defaultModelAgentId).toBe(result.agent.id);
  });

  describe('naming', () => {
    const placeholderTree = (defaultModelAgentId?: ULID): LoomTree => ({
      ...makeTree(treeId, defaultModelAgentId),
      title: 'Loom Tree 2026-11-21T15:13:27.863Z',
    });
    const haiku = parseModelRef('openrouter:anthropic/claude-haiku-4.5');

    it("keeps the source's name on a copy when the model stays", async () => {
      const { useCase } = build({
        agents: [{ ...makeAgent(sharedId), name: 'Claude Haiku (Fast)' }],
        trees: [placeholderTree(sharedId)],
      });

      const result = await useCase.execute({
        treeId,
        changes: { temperature: 0.4 },
      });

      expect(result.forked).toBe(true);
      expect(result.agent.name).toBe('Claude Haiku (Fast)');
    });

    it('names a copy after its new model, never the placeholder title', async () => {
      const { useCase, agents } = build({
        agents: [{ ...makeAgent(sharedId), name: 'Claude Haiku (Fast)' }],
        trees: [placeholderTree(sharedId)],
      });

      const result = await useCase.execute({
        treeId,
        changes: { modelRef: haiku, modelName: 'Anthropic: Claude Haiku 4.5' },
      });

      expect(result.forked).toBe(true);
      expect(result.agent.name).toBe('Anthropic: Claude Haiku 4.5');
      expect(result.agent.name).not.toContain('Loom Tree');
      expect(agents.get(sharedId)?.name).toBe('Claude Haiku (Fast)');
    });

    it('falls back to a readable model id without a display name', async () => {
      const { useCase } = build({
        agents: [makeAgent(sharedId)],
        trees: [placeholderTree(sharedId)],
      });

      const result = await useCase.execute({
        treeId,
        changes: { modelRef: haiku },
      });

      expect(result.agent.name).toBe('claude-haiku-4.5');
    });

    it('names a new agent after its model', async () => {
      const { useCase } = build({ agents: [], trees: [placeholderTree()] });

      const result = await useCase.execute({
        treeId,
        changes: { modelRef: haiku, modelName: 'Anthropic: Claude Haiku 4.5' },
      });

      expect(result.agent.name).toBe('Anthropic: Claude Haiku 4.5');
    });

    it("renames the tree's own agent when its model changes, and only then", async () => {
      const { useCase } = build({
        agents: [
          { ...makeAgent(ownedId, treeId), name: 'Claude Haiku (Fast)' },
        ],
        trees: [placeholderTree(ownedId)],
      });

      const tuned = await useCase.execute({
        treeId,
        changes: { temperature: 0.1 },
      });
      expect(tuned.agent.name).toBe('Claude Haiku (Fast)');

      const sameModel = await useCase.execute({
        treeId,
        changes: { modelRef: mockRef, modelName: 'Mock Model' },
      });
      expect(sameModel.agent.name).toBe('Claude Haiku (Fast)');

      const switched = await useCase.execute({
        treeId,
        changes: { modelRef: haiku, modelName: 'Anthropic: Claude Haiku 4.5' },
      });
      expect(switched.forked).toBe(false);
      expect(switched.agent.id).toBe(ownedId);
      expect(switched.agent.name).toBe('Anthropic: Claude Haiku 4.5');
    });
  });
});
