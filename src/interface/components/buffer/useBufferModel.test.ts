import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Agent, LoomTree } from '@domain/entities';
import { parseModelRef, type ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import {
  bufferModelTokenCap,
  DEFAULT_BUFFER_MAX_TOKENS,
  eligibleOpenRouterOptions,
} from './buffer-model-options';
import { connectedBufferModelProviders } from './buffer-model-providers';
import { useBufferModel } from './useBufferModel';

jest.mock('expo-router/react-navigation', () => {
  const React = require('react') as typeof import('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
  };
});

const treeId = '01KTREE0000000000000000000' as ULID;
const agentId = '01KAGENT000000000000000000' as ULID;
const now = new Date('2026-11-27T12:00:00.000Z');

const makeTree = (defaultModelAgentId?: ULID): LoomTree => ({
  id: treeId,
  groveId: '01KGROVE000000000000000000' as ULID,
  rootNodeId: '01KROOT0000000000000000000' as ULID,
  mode: 'buffer',
  title: 'Buffer',
  defaultModelAgentId,
  createdAt: now,
  updatedAt: now,
});

const makeAgent = (maxTokens?: number): Agent => ({
  id: agentId,
  name: 'Old model',
  type: 'model',
  modelRef: parseModelRef('lmstudio:mock-model'),
  configuration: maxTokens === undefined ? {} : { maxTokens },
  permissions: { loomAware: false, loomWrite: true, loomGenerate: false },
  ownerTreeId: treeId,
  createdAt: now,
  updatedAt: now,
});

const mockLmModel = {
  id: 'mock-base',
  publisher: 'mock',
  connectionEndpoint: 'http://localhost:1235',
  displayName: 'Writing fixture (base)',
  type: 'llm' as const,
  state: 'loaded' as const,
  maxContextLength: 8192,
  sizeBytes: 0,
};

let mockTree: LoomTree = makeTree(agentId);
let mockAgent: Agent | null = makeAgent(100);
let mockOpenRouterKey: string | null = null;
const mockLmFetch = jest.fn(async () => [mockLmModel]);
const mockOpenRouterFetch = jest.fn(async () => []);
const mockExecute = jest.fn(
  async (input: { treeId: ULID; changes: object }) => ({
    agent: {
      ...(mockAgent ?? makeAgent()),
      modelRef: (input.changes as { modelRef: Agent['modelRef'] }).modelRef,
      configuration: input.changes as Agent['configuration'],
    },
    forked: false,
  })
);

const mockServices = {
  repositories: {
    treeRepo: { findById: async () => mockTree },
    agentRepo: { findById: async () => mockAgent },
    userPreferencesRepo: {
      get: async () => ({
        lmstudioSettings: {
          endpoint: 'http://localhost:1235',
          autoLoadModels: true,
          idleTtlSeconds: 0,
        },
      }),
    },
  },
  adapters: {
    credentialStore: {
      getProviderApiKey: async () => mockOpenRouterKey,
    },
    openRouterCatalog: { getModels: mockOpenRouterFetch },
    providerRegistry: {
      getLMStudioAdapter: () => ({ fetchModels: mockLmFetch }),
    },
  },
  useCases: {
    updateTreeModelSettingsUseCase: { execute: mockExecute },
  },
};

jest.mock('@interface/composition', () => ({
  useAppServices: () => mockServices,
}));

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe('buffer model policy', () => {
  it('no direct Anthropic or OpenAI provider is offered', () => {
    expect(
      connectedBufferModelProviders({
        hasOpenRouterKey: true,
        lmStudioEndpoint: 'http://localhost:1234',
      })
    ).toEqual(['openrouter', 'lmstudio']);
  });

  it('empty eligible list is empty, not an error', () => {
    expect(
      eligibleOpenRouterOptions([
        {
          id: 'openai/gpt-4o',
          displayName: 'OpenAI: GPT-4o',
          outputModalities: ['text'],
          endpoints: ['/api/v1/completions'],
        },
      ])
    ).toEqual([]);
  });

  it('keeps a cap and defaults only when there is none', () => {
    expect(bufferModelTokenCap({ maxTokens: 100 })).toBe(100);
    expect(bufferModelTokenCap({})).toBe(DEFAULT_BUFFER_MAX_TOKENS);
  });
});

describe('useBufferModel', () => {
  beforeEach(() => {
    mockTree = makeTree(agentId);
    mockAgent = makeAgent(100);
    mockOpenRouterKey = null;
    mockLmFetch.mockClear();
    mockLmFetch.mockResolvedValue([mockLmModel]);
    mockOpenRouterFetch.mockClear();
    mockOpenRouterFetch.mockResolvedValue([]);
    mockExecute.mockClear();
  });

  it('switching provider drops stale options', async () => {
    mockOpenRouterKey = 'stored-key';
    const hook = renderHook((id: ULID) => useBufferModel(id), treeId);
    await flush();
    expect(hook.result.current.options.map((option) => option.id)).toEqual([
      'mock-base',
    ]);

    await act(() => hook.result.current.chooseProvider('openrouter'));
    expect(hook.result.current.options).toEqual([]);
    expect(hook.result.current.error).toBeNull();
    await hook.unmount();
  });

  it('keeps the current cap on a model switch', async () => {
    const hook = renderHook((id: ULID) => useBufferModel(id), treeId);
    await flush();
    await act(() => hook.result.current.select('mock-base'));
    expect(mockExecute).toHaveBeenCalledWith({
      treeId,
      changes: expect.objectContaining({
        modelRef: 'lmstudio:mock-base',
        maxTokens: 100,
        useMaxTokens: true,
      }),
    });
    await hook.unmount();
  });

  it('uses the named default cap when the tree has no model agent', async () => {
    mockTree = makeTree();
    mockAgent = null;
    const hook = renderHook((id: ULID) => useBufferModel(id), treeId);
    await flush();
    await act(() => hook.result.current.select('mock-base'));
    expect(mockExecute).toHaveBeenCalledWith({
      treeId,
      changes: expect.objectContaining({ maxTokens: 50 }),
    });
    await hook.unmount();
  });
});
