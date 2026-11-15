import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@interface/test-support/render-hook';
import { EMPTY_AGENT_DRAFT } from '../agent-draft-from-agent';
import type { AgentDraft } from '../agent-editor-types';
import { useAgentModelSelection } from './useAgentModelSelection';
import { useHoldMaxTokensToModel } from './useHoldMaxTokensToModel';

const mockAdapters = {
  openRouterCatalog: {
    getModels: async () => [
      {
        id: 'anthropic/claude-sonnet-4.5',
        displayName: 'Claude Sonnet 4.5',
        description: '',
        maxCompletionTokens: 16000,
      },
    ],
  },
  providerRegistry: { getLMStudioAdapter: () => ({}) },
};

jest.mock('@interface/composition', () => ({
  useAppServices: () => ({ adapters: mockAdapters }),
}));

const draft = (modelIdentifier: string): AgentDraft => ({
  ...EMPTY_AGENT_DRAFT,
  provider: 'openrouter',
  modelIdentifier,
  maxTokensInput: '32768',
});

/** The agent editor's pairing: its model selection, and Max Tokens held to it. */
const heldMaxTokens = async (modelIdentifier: string) => {
  const patches: Partial<AgentDraft>[] = [];
  const start = draft(modelIdentifier);
  const hook = renderHook((current: AgentDraft) => {
    const selection = useAgentModelSelection(current);
    useHoldMaxTokensToModel(current, selection.limitModel, (changes) =>
      patches.push(changes)
    );
    return selection;
  }, start);
  await act(async () => undefined);
  await hook.unmount();
  return patches;
};

describe('useAgentModelSelection with the Max Tokens hold', () => {
  it('holds a catalog pick to its output limit', async () => {
    expect(await heldMaxTokens('anthropic/claude-sonnet-4.5')).toEqual([
      { maxTokensInput: '16000' },
    ]);
  });

  it('holds a custom id that names a catalog model, as a catalog pick', async () => {
    expect(await heldMaxTokens('Anthropic/Claude-Sonnet-4.5')).toEqual([
      { maxTokensInput: '16000' },
    ]);
    expect(await heldMaxTokens('anthropic/claude-sonnet-4.5:nitro')).toEqual([
      { maxTokensInput: '16000' },
    ]);
  });

  it('leaves Max Tokens as it is for a custom id the catalog lacks', async () => {
    expect(await heldMaxTokens('someone/new-model')).toEqual([]);
  });
});
