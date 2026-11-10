import { describe, expect, it, jest } from '@jest/globals';
import { GenerateParallelContinuationsUseCase } from '@application/use-cases';
import {
  createInMemoryDialogueStore,
  modelAgentId,
  ownerAgentId,
  pathId,
  sourceNodeId,
  treeId,
  type InMemoryDialogueStore,
} from '@application/use-cases/test-support/in-memory-dialogue-store';
import {
  createScriptedStreamProvider,
  type StreamStep,
} from '@application/use-cases/test-support/scripted-stream-provider';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import type { ChatSession } from '../types';
import { toSlotCardState } from './slot-card-state';
import { useParallelRail } from './useParallelRail';

jest.mock('expo-crypto', () =>
  require('../../../../test-support/node-expo-crypto')
);

const session: ChatSession = {
  ownerAgentId,
  treeId,
  pathId,
  activeNodeId: sourceNodeId,
  model: {
    modelAgentId,
    agentName: 'Test',
    modelIdentifier: 'test/model',
    provider: 'openrouter',
  },
};

type RailProps = {
  readonly railSource: ULID | null;
  readonly sending?: boolean;
  readonly session?: ChatSession;
};

const deferred = () => {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = (
  scripts: readonly (readonly StreamStep[])[],
  storedCount = 3
) => {
  const store = createInMemoryDialogueStore();
  const fake = createScriptedStreamProvider(scripts);
  const useCase = new GenerateParallelContinuationsUseCase({
    ...store.repositories,
    providerRegistry: fake.registry,
    retry: { sleep: async () => {} },
  });
  const refreshIfShowing = jest.fn(async (_nodeId: ULID) => {});
  const refreshRows = jest.fn(async (_session: ChatSession) => {});
  const countRepo = {
    get: jest.fn(async () => storedCount),
    set: jest.fn(async (count: number) => count),
  };
  const credentialStore = {
    getProviderApiKey: async () => 'sk-test',
    setProviderApiKey: async () => {},
    deleteProviderApiKey: async () => {},
  };

  const hook = renderHook(
    ({ railSource, sending = false, session: current = session }: RailProps) =>
      useParallelRail({
        session: current,
        sending,
        continuations: {
          visible: railSource !== null,
          sourceNodeId: railSource,
          items: [],
          refreshIfShowing,
        },
        refreshRows,
        credentialStore,
        continuationCountRepo: countRepo,
        generateParallelContinuationsUseCase: useCase,
      }),
    { railSource: sourceNodeId } as RailProps
  );
  return { store, fake, hook, refreshIfShowing, refreshRows, countRepo };
};

const slotStates = (hook: ReturnType<typeof setup>['hook']) =>
  hook.result.current.cards.map((card) =>
    card.kind === 'slot' ? toSlotCardState(card.view).key : 'saved'
  );

const savedText = (store: InMemoryDialogueStore, nodeId: ULID | undefined) => {
  const node = nodeId ? store.nodes.get(nodeId) : undefined;
  return node?.content.type === 'text' ? node.content.text : undefined;
};

const settle = () => act(async () => {});

describe('useParallelRail', () => {
  it('starts the remembered count from the rail node, and a failing card does not stop the others', async () => {
    const { store, fake, hook, refreshIfShowing, refreshRows } = setup([
      [{ text: 'Once' }, { text: ' upon' }],
      [{ throw: new Error('No endpoints found for bad/model') }],
      [{ text: 'Cut' }, { interrupt: 'network' }],
    ]);
    await settle(); // the stored count (3) loads

    expect(hook.result.current.count).toBe(3);
    await act(() => hook.result.current.generate());

    expect(fake.callCount()).toBe(3);
    expect(slotStates(hook)).toEqual(['done', 'failed', 'interrupted']);
    const [done, failed, interrupted] = hook.result.current.cards;
    if (
      failed.kind !== 'slot' ||
      done.kind !== 'slot' ||
      interrupted.kind !== 'slot'
    ) {
      throw new Error('expected slot cards');
    }
    expect(toSlotCardState(failed.view).body).toContain('No endpoints found');
    expect(failed.view.nodeId).toBeUndefined();

    // The failed card saved nothing; the other two are siblings in the tree.
    expect(store.childrenOfSource()).toHaveLength(2);
    expect(savedText(store, done.view.nodeId)).toBe('Once upon');
    expect(savedText(store, interrupted.view.nodeId)).toBe(
      'Cut\n\n[stream interrupted: network]'
    );

    // The rail reloads as each one saves; the rows reload once at the end.
    expect(refreshIfShowing).toHaveBeenCalledTimes(2);
    expect(refreshIfShowing).toHaveBeenCalledWith(sourceNodeId);
    expect(refreshRows).toHaveBeenCalledTimes(1);
    expect(hook.result.current.running).toBe(false);
  });

  it('stops one of N, keeping its partial text as a saved node marked as stopped', async () => {
    const held = deferred();
    const { store, hook } = setup([
      [{ text: 'First' }, { waitFor: held.promise }, { text: ' finished' }],
      [{ text: 'Partial' }, { waitFor: held.promise }, { text: ' never' }],
      [{ waitFor: held.promise }, { text: 'Third' }],
    ]);
    await settle();

    let generating: Promise<void> = Promise.resolve();
    await act(async () => {
      generating = hook.result.current.generate();
      await new Promise((resolve) => setTimeout(resolve, 60)); // let text flush
    });
    expect(hook.result.current.running).toBe(true);
    expect(hook.result.current.runIsInRail).toBe(true);
    expect(slotStates(hook)).toEqual(['streaming', 'streaming', 'pending']);

    // Stopping settles that card alone; the others keep streaming.
    await act(() => hook.result.current.stop(1));
    expect(slotStates(hook)).toEqual(['streaming', 'stopped', 'pending']);
    expect(hook.result.current.running).toBe(true);

    await act(async () => {
      held.resolve();
      await generating;
    });

    expect(slotStates(hook)).toEqual(['done', 'stopped', 'done']);
    const stopped = hook.result.current.cards[1];
    if (stopped.kind !== 'slot') throw new Error('expected a slot card');
    expect(savedText(store, stopped.view.nodeId)).toBe(
      'Partial\n\n[stream interrupted: cancelled]'
    );
    expect(store.childrenOfSource()).toHaveLength(3);
  });

  it('keeps streaming after a card is made current (the rail closes), then clears the settled cards', async () => {
    const held = deferred();
    const { store, hook } = setup(
      [
        [{ text: 'Chosen' }],
        [{ text: 'Still' }, { waitFor: held.promise }, { text: ' going' }],
      ],
      2
    );
    await settle();

    let generating: Promise<void> = Promise.resolve();
    await act(async () => {
      generating = hook.result.current.generate();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(slotStates(hook)).toEqual(['done', 'streaming']);

    // Making slot 0 current is the chat's rewind, which closes the rail.
    await hook.rerender({ railSource: null });
    expect(hook.result.current.running).toBe(true);
    expect(hook.result.current.cards).toEqual([]);

    // Reopening the node shows the run's cards again.
    await hook.rerender({ railSource: sourceNodeId });
    expect(slotStates(hook)).toEqual(['done', 'streaming']);
    await hook.rerender({ railSource: null });

    await act(async () => {
      held.resolve();
      await generating;
    });
    expect(store.childrenOfSource()).toHaveLength(2);

    await hook.rerender({ railSource: sourceNodeId });
    expect(hook.result.current.cards).toEqual([]); // cleared; the rail lists them as siblings
  });

  it('refreshes the rows against the current session when a run ends, not the one it started with', async () => {
    const held = deferred();
    const { hook, refreshRows } = setup(
      [[{ waitFor: held.promise }, { text: 'Late' }]],
      1
    );
    await settle();

    let generating: Promise<void> = Promise.resolve();
    await act(async () => {
      generating = hook.result.current.generate();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // The user picks another agent mid-run (the ⚙️ sheet reinitializes).
    const switched: ChatSession = {
      ...session,
      model: {
        modelAgentId: 'switched-agent' as ULID,
        agentName: 'Switched',
        modelIdentifier: 'other/model',
        provider: 'lmstudio',
      },
    };
    await hook.rerender({ railSource: sourceNodeId, session: switched });

    await act(async () => {
      held.resolve();
      await generating;
    });
    expect(refreshRows).toHaveBeenCalledTimes(1);
    expect(refreshRows).toHaveBeenCalledWith(switched);
  });

  it('does not start while a single generation is in flight, and remembers a new count', async () => {
    const { fake, hook, countRepo } = setup([], 2);
    await settle();
    await hook.rerender({ railSource: sourceNodeId, sending: true });

    expect(hook.result.current.canGenerate).toBe(false);
    await act(() => hook.result.current.generate());
    expect(fake.callCount()).toBe(0);

    await act(() => hook.result.current.setCount(9));
    expect(hook.result.current.count).toBe(4);
    expect(countRepo.set).toHaveBeenCalledWith(4);
  });
});
