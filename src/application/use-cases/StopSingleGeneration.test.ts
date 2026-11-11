import { describe, expect, it, jest } from '@jest/globals';
import { LlmProviderError } from '@application/services/llm';
import { GenerateDialogueContinuationUseCase } from './GenerateDialogueContinuationUseCase';
import { SendDialogueTurnUseCase } from './SendDialogueTurnUseCase';
import {
  createInMemoryDialogueStore,
  modelAgentId,
  ownerAgentId,
  pathId,
  rootNodeId,
  sourceNodeId,
  treeId,
} from './test-support/in-memory-dialogue-store';
import {
  createScriptedStreamProvider,
  type StreamStep,
} from './test-support/scripted-stream-provider';

jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));

/**
 * The composer's stop button for a single send or regenerate. It uses the
 * same abort path as a parallel card's stop, so a stopped reply is saved the
 * same way: partial text kept and marked, nothing saved before any text.
 */
const blocked = () => {
  const gate = { release: () => {} };
  const waitFor = new Promise<void>((resolve) => {
    gate.release = resolve;
  });
  return { gate, waitFor };
};

const textOf = (
  store: ReturnType<typeof createInMemoryDialogueStore>,
  nodeId: string
) => {
  const node = store.nodes.get(nodeId as never);
  return node?.content.type === 'text' ? node.content.text : undefined;
};

const setupSend = (script: readonly StreamStep[]) => {
  const store = createInMemoryDialogueStore();
  const fake = createScriptedStreamProvider([script]);
  const useCase = new SendDialogueTurnUseCase({
    ...store.repositories,
    providerRegistry: fake.registry,
  });
  return { store, fake, useCase };
};

const setupRegenerate = (script: readonly StreamStep[]) => {
  const store = createInMemoryDialogueStore();
  const fake = createScriptedStreamProvider([script]);
  const useCase = new GenerateDialogueContinuationUseCase({
    ...store.repositories,
    providerRegistry: fake.registry,
  });
  return { store, fake, useCase };
};

const session = {
  ownerAgentId,
  modelAgentId,
  modelIdentifier: 'test/model',
  treeId,
  pathId,
};

describe('stopping a single generation', () => {
  it('send: keeps streamed text as the reply, marked stopped', async () => {
    const { waitFor } = blocked();
    const { store, fake, useCase } = setupSend([
      { text: 'Once upon' },
      { waitFor },
      { text: ' never' },
    ]);
    const stop = new AbortController();

    const result = await useCase.execute({
      session: { ...session, activeNodeId: sourceNodeId },
      prompt: 'Go on.',
      providerApiKey: 'sk-test',
      stream: true,
      signal: stop.signal,
      onAssistantTextDelta: () => stop.abort(),
    });

    expect(fake.requests[0].signal).toBe(stop.signal);
    expect(result.completion.interruptionReason).toBe('cancelled');
    expect(textOf(store, result.assistantNodeId)).toBe(
      'Once upon\n\n[stream interrupted: cancelled]'
    );
    expect(store.pathNodeIds().slice(-2)).toEqual([
      result.userNodeId,
      result.assistantNodeId,
    ]);
    expect(store.activeNodeId()).toBe(result.assistantNodeId);
  });

  it('send: a stop before any text keeps the user turn and saves no reply', async () => {
    const { waitFor } = blocked();
    const { store, useCase } = setupSend([{ waitFor }, { text: 'never' }]);
    const stop = new AbortController();
    let userNodeId: string | undefined;

    const running = useCase.execute({
      session: { ...session, activeNodeId: sourceNodeId },
      prompt: 'Go on.',
      providerApiKey: 'sk-test',
      stream: true,
      signal: stop.signal,
      onUserNodeCommitted: ({ userNodeId: id }) => {
        userNodeId = id;
        stop.abort();
      },
    });

    await expect(running).rejects.toMatchObject({ code: 'cancelled' });
    await expect(running).rejects.toBeInstanceOf(LlmProviderError);
    expect(store.createdNodeTexts).toEqual(['Go on.']);
    expect(store.pathNodeIds()).toEqual([rootNodeId, sourceNodeId, userNodeId]);
    expect(store.activeNodeId()).toBe(userNodeId);
  });

  it('regenerate: keeps streamed text as a new sibling, marked stopped', async () => {
    const { waitFor } = blocked();
    const { store, fake, useCase } = setupRegenerate([
      { text: 'Partial' },
      { waitFor },
      { text: ' never' },
    ]);
    const stop = new AbortController();

    const result = await useCase.execute({
      session,
      sourceNodeId,
      providerApiKey: 'sk-test',
      stream: true,
      signal: stop.signal,
      onAssistantTextDelta: () => stop.abort(),
    });

    expect(fake.requests[0].signal).toBe(stop.signal);
    expect(result.completion.interruptionReason).toBe('cancelled');
    expect(textOf(store, result.assistantNodeId)).toBe(
      'Partial\n\n[stream interrupted: cancelled]'
    );
    expect(store.childrenOfSource()).toEqual([result.assistantNodeId]);
    expect(store.activeNodeId()).toBe(result.assistantNodeId);
  });

  it('regenerate: a stop before any text saves nothing and leaves the path', async () => {
    const { waitFor } = blocked();
    const { store, useCase } = setupRegenerate([{ waitFor }, { text: 'never' }]);
    const stop = new AbortController();
    stop.abort();

    await expect(
      useCase.execute({
        session,
        sourceNodeId,
        providerApiKey: 'sk-test',
        stream: true,
        signal: stop.signal,
      })
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(store.createdNodeTexts).toEqual([]);
    expect(store.pathNodeIds()).toEqual([rootNodeId, sourceNodeId]);
    expect(store.activeNodeId()).toBe(sourceNodeId);
  });
});
