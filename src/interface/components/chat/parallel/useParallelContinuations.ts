import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ICredentialStore } from '@application/services/security';
import type {
  GenerateParallelContinuationsResult,
  GenerateParallelContinuationsUseCase,
  SwitchDialoguePathResult,
  SwitchDialoguePathUseCase,
} from '@application/use-cases';
import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import { LlmProviderError } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';
import { getProviderApiKey } from '../provider-key';
import type { ChatSession } from '../types';
import {
  initialParallelSlotsState,
  parallelSlotsReducer,
} from './parallel-slots-state';
import { useBufferedSlotText } from './useBufferedSlotText';

type UseParallelContinuationsInput = {
  readonly session: ChatSession | null;
  readonly generateParallelContinuationsUseCase: Pick<
    GenerateParallelContinuationsUseCase,
    'execute'
  >;
  readonly switchDialoguePathUseCase: Pick<SwitchDialoguePathUseCase, 'execute'>;
  readonly credentialStore: ICredentialStore;
};

type RunControls = {
  readonly all: AbortController;
  readonly perSlot: readonly AbortController[];
};

const toMessage = (caught: unknown): string =>
  caught instanceof LlmProviderError
    ? `[${caught.provider}:${caught.code}] ${caught.message}`
    : caught instanceof Error
      ? caught.message
      : String(caught);

/**
 * Drives "draw several continuations at once" for the chat screen: starts N
 * streams from one node, keeps one card's worth of state per slot, stops one
 * or all, and makes a chosen result the current path. Renders nothing.
 *
 * Results are saved as siblings as they finish, whether or not one is
 * chosen. Choosing only moves the active path; the rest stay in the tree.
 */
export const useParallelContinuations = (input: UseParallelContinuationsInput) => {
  const {
    session,
    generateParallelContinuationsUseCase,
    switchDialoguePathUseCase,
    credentialStore,
  } = input;
  const [state, dispatch] = useReducer(
    parallelSlotsReducer,
    initialParallelSlotsState
  );
  const controlsRef = useRef<RunControls | null>(null);
  const { setText, flushNow, discard } = useBufferedSlotText((texts) =>
    dispatch({ type: 'text', texts })
  );

  const onSlotEvent = useCallback(
    (event: ContinuationSlotEvent) => {
      if (event.type === 'delta') {
        setText(event.slot, event.content);
        return;
      }
      flushNow();
      dispatch({ type: 'outcome', outcome: event });
    },
    [flushNow, setText]
  );

  const start = useCallback(
    async (
      sourceNodeId: ULID,
      count: number
    ): Promise<GenerateParallelContinuationsResult | null> => {
      if (!session || controlsRef.current) {
        return null;
      }
      const controls: RunControls = {
        all: new AbortController(),
        perSlot: Array.from({ length: count }, () => new AbortController()),
      };
      controlsRef.current = controls;
      discard();
      dispatch({ type: 'start', sourceNodeId, count });

      try {
        const providerApiKey = await getProviderApiKey(
          credentialStore,
          session.provider
        );
        const result = await generateParallelContinuationsUseCase.execute({
          modelAgentId: session.modelAgentId,
          modelIdentifier: session.modelIdentifier,
          treeId: session.treeId,
          pathId: session.pathId,
          sourceNodeId,
          providerApiKey,
          providerAppName: 'Aspen Grove RN',
          count,
          signal: controls.all.signal,
          slotSignals: controls.perSlot.map((controller) => controller.signal),
          onSlotEvent,
        });
        flushNow();
        dispatch({ type: 'finished' });
        return result;
      } catch (caught) {
        discard();
        dispatch({ type: 'failed', message: toMessage(caught) });
        return null;
      } finally {
        if (controlsRef.current === controls) {
          controlsRef.current = null;
        }
      }
    },
    [
      credentialStore,
      discard,
      flushNow,
      generateParallelContinuationsUseCase,
      onSlotEvent,
      session,
    ]
  );

  const stop = useCallback((slot: number) => {
    const controller = controlsRef.current?.perSlot[slot];
    if (!controller || controller.signal.aborted) {
      return;
    }
    controller.abort();
    dispatch({ type: 'stopRequested', slot });
  }, []);

  const stopAll = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.perSlot.forEach((_, slot) =>
      dispatch({ type: 'stopRequested', slot })
    );
    controls.all.abort();
  }, []);

  /**
   * Makes a slot's saved node the current path. Returns null when that slot
   * has nothing saved (still streaming, failed, or stopped before any text).
   * The caller refreshes its rows from the returned path.
   */
  const choose = useCallback(
    async (slot: number): Promise<SwitchDialoguePathResult | null> => {
      const nodeId = state.slots.find((view) => view.slot === slot)?.nodeId;
      if (!session || !nodeId) {
        return null;
      }
      return switchDialoguePathUseCase.execute({
        pathId: session.pathId,
        ownerAgentId: session.ownerAgentId,
        targetNodeId: nodeId,
      });
    },
    [session, state.slots, switchDialoguePathUseCase]
  );

  /** Clears the cards. Only once settled: a running set must be stopped first. */
  const reset = useCallback(() => {
    if (controlsRef.current) {
      return;
    }
    discard();
    dispatch({ type: 'reset' });
  }, [discard]);

  // Leaving the screen stops every stream; finished results are already saved.
  useEffect(() => () => controlsRef.current?.all.abort(), []);

  return {
    ...state,
    running: state.phase === 'running',
    start,
    stop,
    stopAll,
    choose,
    reset,
  };
};
