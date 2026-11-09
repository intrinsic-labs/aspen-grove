import { describe, expect, it } from '@jest/globals';
import type { Agent, UserPreferences } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { UpdateLoomTreeInput } from '@application/repositories';
import {
  isUsableTreeModelAgent,
  resolveTreeModelAgent,
} from './resolve-tree-model-agent';

const now = new Date('2026-11-09T12:00:00.000Z');
const treeId = '01KTREE0000000000000000000' as ULID;
const otherTreeId = '01KTREE0000000000000000001' as ULID;

const modelAgent = (id: string, changes: Partial<Agent> = {}): Agent => ({
  id: id as ULID,
  name: `Agent ${id}`,
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
  ...changes,
});

const setup = (input: {
  readonly agents: readonly Agent[];
  readonly pinnedAgentId?: ULID;
}) => {
  const updates: UpdateLoomTreeInput[] = [];
  let preferences = {
    defaultModelAgentId: input.pinnedAgentId,
  } as unknown as UserPreferences;
  const dependencies = {
    agentRepository: {
      findById: async (id: ULID) =>
        input.agents.find((agent) => agent.id === id) ?? null,
      findSharedModels: async () =>
        input.agents.filter(
          (agent) =>
            agent.type === 'model' && !agent.archivedAt && !agent.ownerTreeId
        ),
    },
    userPreferencesRepository: {
      get: async () => preferences,
      update: async (changes: Partial<UserPreferences>) => {
        preferences = { ...preferences, ...changes } as UserPreferences;
        return preferences;
      },
    },
    loomTreeRepository: {
      update: async (update: UpdateLoomTreeInput) => {
        updates.push(update);
        return {} as never;
      },
    },
  };
  return { dependencies, updates };
};

describe('resolveTreeModelAgent', () => {
  it("keeps the tree's own usable agent", async () => {
    const own = modelAgent('01KOWN00000000000000000000');
    const fallback = modelAgent('01KDEF00000000000000000000');
    const { dependencies, updates } = setup({ agents: [own, fallback] });

    const result = await resolveTreeModelAgent(
      { id: treeId, defaultModelAgentId: own.id },
      dependencies
    );

    expect(result).toEqual({ status: 'configured', agent: own });
    expect(updates).toEqual([]);
  });

  it('adopts the default agent when the tree has none', async () => {
    const fallback = modelAgent('01KDEF00000000000000000000');
    const { dependencies, updates } = setup({ agents: [fallback] });

    const result = await resolveTreeModelAgent(
      { id: treeId, defaultModelAgentId: undefined },
      dependencies
    );

    expect(result).toEqual({ status: 'adopted', agent: fallback });
    expect(updates).toEqual([
      { id: treeId, changes: { defaultModelAgentId: fallback.id } },
    ]);
  });

  it('prefers the pinned default over the first shared agent', async () => {
    const first = modelAgent('01KFIRST000000000000000000');
    const pinned = modelAgent('01KPIN00000000000000000000');
    const { dependencies } = setup({
      agents: [first, pinned],
      pinnedAgentId: pinned.id,
    });

    const result = await resolveTreeModelAgent(
      { id: treeId, defaultModelAgentId: undefined },
      dependencies
    );

    expect(result).toEqual({ status: 'adopted', agent: pinned });
  });

  it.each([
    ['a deleted', undefined],
    [
      'an archived',
      modelAgent('01KOLD00000000000000000000', { archivedAt: now }),
    ],
  ])('replaces %s agent with the default', async (_label, stale) => {
    const fallback = modelAgent('01KDEF00000000000000000000');
    const { dependencies, updates } = setup({
      agents: stale ? [stale, fallback] : [fallback],
    });

    const result = await resolveTreeModelAgent(
      { id: treeId, defaultModelAgentId: '01KOLD00000000000000000000' as ULID },
      dependencies
    );

    expect(result).toEqual({ status: 'adopted', agent: fallback });
    expect(updates).toHaveLength(1);
  });

  it('opens without an agent when there is nothing to adopt', async () => {
    const archived = modelAgent('01KOLD00000000000000000000', {
      archivedAt: now,
    });
    const { dependencies, updates } = setup({ agents: [archived] });

    const result = await resolveTreeModelAgent(
      { id: treeId, defaultModelAgentId: archived.id },
      dependencies
    );

    expect(result).toEqual({ status: 'missing' });
    expect(updates).toEqual([]);
  });
});

describe('isUsableTreeModelAgent', () => {
  it('accepts a shared model agent and one owned by this tree', () => {
    expect(isUsableTreeModelAgent(modelAgent('01KA'), treeId)).toBe(true);
    expect(
      isUsableTreeModelAgent(
        modelAgent('01KB', { ownerTreeId: treeId }),
        treeId
      )
    ).toBe(true);
  });

  it.each([
    ['nothing', null],
    ['an archived agent', modelAgent('01KC', { archivedAt: now })],
    ['an agent without a model', modelAgent('01KD', { modelRef: undefined })],
    ['a human agent', modelAgent('01KE', { type: 'human' })],
    ['another tree’s agent', modelAgent('01KF', { ownerTreeId: otherTreeId })],
  ])('rejects %s', (_label, agent) => {
    expect(isUsableTreeModelAgent(agent, treeId)).toBe(false);
  });
});
