import { describe, expect, it, jest } from '@jest/globals';
import { GenerateDialogueContinuationUseCase } from './GenerateDialogueContinuationUseCase';
import { GenerateParallelContinuationsUseCase } from './GenerateParallelContinuationsUseCase';
import { SendDialogueTurnUseCase } from './SendDialogueTurnUseCase';
import {
  createInMemoryDialogueStore,
  modelAgentId,
  ownerAgentId,
  pathId,
  sourceNodeId,
  treeId,
  type InMemoryDialogueStoreOptions,
} from './test-support/in-memory-dialogue-store';
import { createScriptedStreamProvider } from './test-support/scripted-stream-provider';

jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));

/**
 * Every request a dialogue sends asks for at most the model's output limit,
 * whatever the agent has stored: an agent saved at 32768 and then moved to a
 * 2048-token model must not send 32768.
 */
const session = {
  ownerAgentId,
  modelAgentId,
  modelIdentifier: 'test/model',
  treeId,
  pathId,
};

const sentMaxTokens = async (
  kind: 'send' | 'regenerate' | 'parallel',
  options: InMemoryDialogueStoreOptions
): Promise<readonly (number | undefined)[]> => {
  const store = createInMemoryDialogueStore(options);
  const fake = createScriptedStreamProvider([[{ text: 'a' }], [{ text: 'b' }]]);
  const deps = { ...store.repositories, providerRegistry: fake.registry };
  if (kind === 'send') {
    await new SendDialogueTurnUseCase(deps).execute({
      session: { ...session, activeNodeId: sourceNodeId },
      prompt: 'Go on.',
      providerApiKey: 'sk-test',
      stream: true,
    });
  } else if (kind === 'regenerate') {
    await new GenerateDialogueContinuationUseCase(deps).execute({
      session,
      sourceNodeId,
      providerApiKey: 'sk-test',
      stream: true,
    });
  } else {
    await new GenerateParallelContinuationsUseCase({
      ...deps,
      retry: { sleep: async () => {} },
    }).execute({
      ...session,
      sourceNodeId,
      providerApiKey: 'sk-test',
      count: 2,
    });
  }
  return fake.requests.map((request) => request.maxTokens);
};

describe.each(['send', 'regenerate', 'parallel'] as const)(
  '%s: maxTokens at send time',
  (kind) => {
    it("is capped at the model's known output limit", async () => {
      const sent = await sentMaxTokens(kind, {
        maxTokens: 32768,
        outputLimit: 2048,
      });
      expect(sent.length).toBeGreaterThan(0);
      expect(sent.every((value) => value === 2048)).toBe(true);
    });

    it('is the stored value when it fits or the limit is unknown', async () => {
      const fits = await sentMaxTokens(kind, {
        maxTokens: 1000,
        outputLimit: 2048,
      });
      expect(fits.every((value) => value === 1000)).toBe(true);
      const unknown = await sentMaxTokens(kind, { maxTokens: 32768 });
      expect(unknown.every((value) => value === 32768)).toBe(true);
    });

    it("stays unset (the provider's default) when the agent sets none", async () => {
      const sent = await sentMaxTokens(kind, { outputLimit: 2048 });
      expect(sent.every((value) => value === undefined)).toBe(true);
    });
  }
);
