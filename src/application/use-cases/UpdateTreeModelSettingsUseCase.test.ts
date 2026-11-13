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
    docRead: true,
    docWrite: false,
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
    expect(result.agent.name).toBe('Mock (Ancient Trees)');
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
    expect(result.agent.name).toBe('mock-model (Ancient Trees)');
    expect(result.agent.ownerTreeId).toBe(treeId);
    expect(trees.get(treeId)?.defaultModelAgentId).toBe(result.agent.id);
  });
});
