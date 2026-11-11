import { describe, expect, it, jest } from '@jest/globals';
import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import { LlmProviderError } from '@application/services/llm';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import type { ULID } from '@domain/value-objects';
import { GenerateParallelContinuationsUseCase } from './GenerateParallelContinuationsUseCase';
import {
  createInMemoryDialogueStore,
  modelAgentId,
  pathId,
  sourceNodeId,
  treeId,
  type InMemoryDialogueStore,
} from './test-support/in-memory-dialogue-store';
import {
  createScriptedStreamProvider,
  type StreamStep,
} from './test-support/scripted-stream-provider';

// Real SHA-256 so hash comparisons and provenance checks mean something.
jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));

const setup = (scripts: readonly (readonly StreamStep[])[]) => {
  const store = createInMemoryDialogueStore();
  const fake = createScriptedStreamProvider(scripts);
  const useCase = new GenerateParallelContinuationsUseCase({
    ...store.repositories,
    providerRegistry: fake.registry,
    retry: { sleep: async () => {} },
  });
  const events: ContinuationSlotEvent[] = [];
  const run = (
    count: number,
    extra: {
      signal?: AbortSignal;
      slotSignals?: readonly (AbortSignal | undefined)[];
      onSlotEvent?: (event: ContinuationSlotEvent) => void;
    } = {}
  ) =>
    useCase.execute({
      modelAgentId,
      modelIdentifier: 'test/model',
      treeId,
      pathId,
      sourceNodeId,
      providerApiKey: 'sk-test',
      count,
      ...extra,
      onSlotEvent: (event) => {
        events.push(event);
        extra.onSlotEvent?.(event);
      },
    });
  return { store, fake, run, events };
};

const savedText = (store: InMemoryDialogueStore, nodeId: ULID) => {
  const node = store.nodes.get(nodeId);
  return node?.content.type === 'text' ? node.content.text : undefined;
};

const verify = (store: InMemoryDialogueStore, nodeId: ULID) =>
  verifyModelNodeProvenance({
    nodeId,
    nodeRepository: store.repositories.nodeRepository,
    edgeRepository: store.repositories.edgeRepository,
    rawApiResponseRepository: store.repositories.rawApiResponseRepository,
  });

// Not `invalidRequest`: that one falls back to a non-streaming request.
const nonRetryable = (message: string) =>
  new LlmProviderError({
    code: 'contextTooLong',
    message,
    provider: 'openrouter',
    retryable: false,
  });

describe('GenerateParallelContinuationsUseCase', () => {
  it('streams N continuations at once and saves each as a verified sibling with its own raw response', async () => {
    // Each stream waits until all three are open, so this only finishes if
    // the slots really run concurrently.
    const together = { waitForOpenStreams: 3 };
    const { store, fake, run, events } = setup([
      [together, { text: 'Once' }, { text: ' upon' }],
      [together, { text: 'In a' }, { text: ' land' }],
      [together, { text: 'Long' }, { text: ' ago' }],
    ]);

    const result = await run(3);

    expect(fake.maxOpenStreams()).toBe(3);
    expect(result.sourceNodeId).toBe(sourceNodeId);
    expect(result.slots.map((slot) => [slot.slot, slot.type])).toEqual([
      [0, 'done'],
      [1, 'done'],
      [2, 'done'],
    ]);

    const nodeIds = result.slots.map((slot) =>
      slot.type === 'done' ? slot.nodeId : ('' as ULID)
    );
    expect(new Set(nodeIds).size).toBe(3);
    expect(store.childrenOfSource().sort()).toEqual([...nodeIds].sort());
    expect(nodeIds.map((id) => savedText(store, id))).toEqual([
      'Once upon',
      'In a land',
      'Long ago',
    ]);

    const rawBodies = nodeIds.map(
      (id) => store.rawResponses.get(id)?.responseBody
    );
    expect(new Set(rawBodies).size).toBe(3);
    const nodeHashes = nodeIds.map((id) => store.nodes.get(id)?.contentHash);
    expect(new Set(nodeHashes).size).toBe(3);
    nodeHashes.forEach((hash) => expect(hash).toMatch(/^[0-9a-f]{64}$/));
    for (const id of nodeIds) {
      const verification = await verify(store, id);
      expect(verification.status).toBe('valid');
      expect(verification.parentNodeCount).toBe(1);
    }

    // Swapping one node's evidence for another's breaks its chain.
    const swapped = store.rawResponses.get(nodeIds[1]);
    store.rawResponses.set(nodeIds[0], {
      ...store.rawResponses.get(nodeIds[0])!,
      responseBody: swapped!.responseBody,
    });
    expect((await verify(store, nodeIds[0])).status).toBe('hashMismatch');

    const doneEvents = events.filter((event) => event.type === 'done');
    expect(doneEvents).toHaveLength(3);
    expect(store.touchCount()).toBe(1);
  });

  it('keeps the other slots going when one fails, and reports the failure on its own slot', async () => {
    const { store, run, events } = setup([
      [{ text: 'Healthy' }, { text: ' one' }],
      [{ text: 'Half' }, { errorChunk: 'upstream exploded' }],
      [{ throw: nonRetryable('bad request') }],
      [{ text: 'Cut' }, { text: ' off' }, { interrupt: 'network' }],
    ]);

    const result = await run(4);

    const [healthy, failedMidStream, failedAtStart, interrupted] = result.slots;
    expect(healthy.type).toBe('done');
    expect(failedMidStream).toMatchObject({
      slot: 1,
      type: 'error',
      message: 'upstream exploded',
    });
    expect(failedAtStart).toMatchObject({
      slot: 2,
      type: 'error',
      code: 'contextTooLong',
    });
    expect(interrupted).toMatchObject({ slot: 3, type: 'interrupted', reason: 'network' });

    // Only the healthy and the interrupted-with-text slots are saved.
    expect(store.childrenOfSource()).toHaveLength(2);
    if (interrupted.type !== 'interrupted' || healthy.type !== 'done') {
      throw new Error('unexpected outcome types');
    }
    expect(savedText(store, interrupted.nodeId)).toBe(
      'Cut off\n\n[stream interrupted: network]'
    );
    expect((await verify(store, interrupted.nodeId)).isValid).toBe(true);
    expect(events.filter((event) => event.type === 'error')).toHaveLength(2);
  });

  it('stops one slot without stopping the others, keeping text it already streamed', async () => {
    const release = { resolve: () => {} };
    const released = new Promise<void>((resolve) => {
      release.resolve = resolve;
    });
    const stopSlot1 = new AbortController();
    const stopSlot2 = new AbortController();
    const { store, run } = setup([
      [{ text: 'First' }, { waitFor: released }, { text: ' done' }],
      [{ text: 'Partial' }, { waitFor: released }, { text: ' never' }],
      [{ waitFor: released }, { text: 'never' }],
    ]);

    const running = run(3, {
      slotSignals: [undefined, stopSlot1.signal, stopSlot2.signal],
      onSlotEvent: (event) => {
        // Stop slots 1 and 2 as soon as slot 1 has shown text.
        if (event.type === 'delta' && event.slot === 1) {
          stopSlot1.abort();
          stopSlot2.abort();
          release.resolve();
        }
      },
    });
    const result = await running;

    expect(result.slots[0]).toMatchObject({ type: 'done' });
    const [first, stoppedWithText, stoppedEmpty] = result.slots;
    expect(stoppedWithText.type).toBe('cancelled');
    expect(stoppedEmpty).toEqual({ slot: 2, type: 'cancelled' });
    if (stoppedWithText.type !== 'cancelled' || !stoppedWithText.saved) {
      throw new Error('expected the partial text to be saved');
    }
    if (first.type !== 'done') {
      throw new Error('expected slot 0 to finish');
    }
    expect(savedText(store, first.nodeId)).toBe('First done');
    expect(savedText(store, stoppedWithText.saved.nodeId)).toBe(
      'Partial'
    );
    expect(store.childrenOfSource()).toHaveLength(2);
  });

  it('stops every slot with the shared signal', async () => {
    const stopAll = new AbortController();
    const never = new Promise<void>(() => {});
    const { store, run } = setup([
      [{ waitFor: never }],
      [{ text: 'Some' }, { waitFor: never }],
    ]);

    const running = run(2, {
      signal: stopAll.signal,
      onSlotEvent: (event) => {
        if (event.type === 'delta') {
          stopAll.abort();
        }
      },
    });
    const result = await running;

    expect(result.slots.map((slot) => slot.type)).toEqual([
      'cancelled',
      'cancelled',
    ]);
    expect(store.childrenOfSource()).toHaveLength(1);
  });

  it('retries a slot only before its first chunk', async () => {
    const retryable = new LlmProviderError({
      code: 'serverError',
      message: 'temporarily unavailable',
      provider: 'openrouter',
      retryable: true,
    });
    // Calls 0 and 1 are the first attempts of slots 0 and 1; call 2 is
    // slot 0's retry. Slot 1 fails after streaming, so it is not retried.
    const { fake, run } = setup([
      [{ throw: retryable }],
      [{ text: 'Started' }, { throw: retryable }],
      [{ text: 'Retried' }],
    ]);

    const result = await run(2);

    expect(fake.callCount()).toBe(3);
    expect(result.slots[0]).toMatchObject({ type: 'done' });
    expect(result.slots[1]).toMatchObject({
      type: 'error',
      message: 'temporarily unavailable',
    });
  });

  it('never writes streamed deltas, only each finished continuation', async () => {
    const { store, run, events } = setup([
      [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
      [{ text: 'x' }, { text: 'y' }],
    ]);
    const finalText = ['abc', 'xy'];
    const writtenWhileSlotStreamed: string[] = [];

    await run(2, {
      onSlotEvent: (event) => {
        if (
          event.type === 'delta' &&
          store.createdNodeTexts.includes(finalText[event.slot])
        ) {
          writtenWhileSlotStreamed.push(finalText[event.slot]);
        }
      },
    });

    expect(events.filter((event) => event.type === 'delta')).toHaveLength(5);
    // One write per continuation, holding the whole text, after its stream.
    expect([...store.createdNodeTexts].sort()).toEqual(finalText);
    expect(writtenWhileSlotStreamed).toEqual([]);
  });

  it('isolates a throwing listener from the generation', async () => {
    const { run } = setup([[{ text: 'ok' }]]);

    const result = await run(1, {
      onSlotEvent: () => {
        throw new Error('render bug');
      },
    });

    expect(result.slots[0]).toMatchObject({ type: 'done' });
  });

  it('rejects a count outside 1 to 4 before sending anything', async () => {
    const { fake, run } = setup([]);

    await expect(run(0)).rejects.toThrow('from 1 to 4');
    await expect(run(5)).rejects.toThrow('from 1 to 4');
    await expect(run(1.5)).rejects.toThrow('from 1 to 4');
    expect(fake.callCount()).toBe(0);
  });

  it('sends each slot the same context but its own abort signal', async () => {
    const { fake, run } = setup([[{ text: 'a' }], [{ text: 'b' }]]);

    await run(2);

    const [first, second] = fake.requests;
    expect(first.messages).toEqual(second.messages);
    expect(first.messages).toEqual([
      { role: 'user', content: 'Tell me a story.\n\nMake it short.' },
    ]);
    expect(first.signal).toBeDefined();
    expect(first.signal).not.toBe(second.signal);
  });
});
