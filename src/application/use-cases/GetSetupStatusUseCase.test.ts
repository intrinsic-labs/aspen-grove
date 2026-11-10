import { describe, expect, it } from '@jest/globals';
import type { Agent, UserPreferences } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { GetSetupStatusUseCase } from './GetSetupStatusUseCase';

const now = new Date('2026-11-09T12:00:00.000Z');

const agent = (id: string, modelRef: string): Agent => ({
  id: id as ULID,
  name: id,
  type: 'model',
  modelRef: modelRef as Agent['modelRef'],
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
});

const build = (input: {
  agents: Agent[];
  onboardingCompletedAt?: Date;
  hasKey: boolean;
}) => {
  let preferences = {
    onboardingCompletedAt: input.onboardingCompletedAt,
  } as UserPreferences;
  return new GetSetupStatusUseCase({
    agentRepository: {
      findById: async (id) => input.agents.find((a) => a.id === id) ?? null,
      findSharedModels: async () => input.agents,
    },
    userPreferencesRepository: {
      get: async () => preferences,
      update: async (changes) => {
        preferences = { ...preferences, ...changes } as UserPreferences;
        return preferences;
      },
    },
    hasOpenRouterKey: async () => input.hasKey,
  });
};

describe('GetSetupStatusUseCase', () => {
  it('reports first-run on a fresh install', async () => {
    const result = await build({ agents: [], hasKey: false }).execute();
    expect(result).toEqual({ status: 'first-run', defaultAgent: null });
  });

  it('reports no-agent after onboarding was skipped', async () => {
    const result = await build({
      agents: [],
      onboardingCompletedAt: now,
      hasKey: true,
    }).execute();
    expect(result.status).toBe('no-agent');
  });

  it('reports no-key for an OpenRouter default agent without a key', async () => {
    const sonnet = agent('A1', 'openrouter:~anthropic/claude-sonnet-latest');
    const result = await build({ agents: [sonnet], hasKey: false }).execute();
    expect(result.status).toBe('no-key');
    expect(result.defaultAgent?.id).toBe(sonnet.id);
  });

  it('is ready for an LM Studio agent with no OpenRouter key', async () => {
    const local = agent('A2', 'lmstudio:qwen/qwen3-8b');
    const result = await build({ agents: [local], hasKey: false }).execute();
    expect(result.status).toBe('ready');
  });
});
