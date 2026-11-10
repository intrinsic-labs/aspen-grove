import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ICredentialStore } from '@application/services/security';
import type {
  GenerateParallelContinuationsResult,
  GenerateParallelContinuationsUseCase,
} from '@application/use-cases';
import type {
  ContinuationSlotEvent,
  ContinuationSlotOutcome,
} from '@application/services/dialogue-continuation';
import { describeProviderError } from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { getProviderApiKey } from '../provider-key';
import type { ChatSession } from '../types';
import {
  initialParallelSlotsState,
  parallelSlotsReducer,
} from './parallel-slots-state';
import { describeSlotFailure } from './describe-slot-failure';
import { useBufferedSlotText } from './useBufferedSlotText';

type UseParallelContinuationsInput = {
  readonly session: ChatSession | null;
  readonly generateParallelContinuationsUseCase: Pick<
    GenerateParallelContinuationsUseCase,
    'execute'
  >;
  readonly credentialStore: ICredentialStore;
  /** Each slot's outcome, as it settles (to reload what shows saved nodes). */
  readonly onSlotSettled?: (outcome: ContinuationSlotOutcome) => void;
};

type RunControls = {
  readonly all: AbortController;
  readonly perSlot: readonly AbortController[];
};

const toMessage = (caught: unknown, provider: SelectableProvider): string =>
  describeProviderError(caught, { provider }).message;

/**
 * Drives "draw several continuations at once" for the chat screen: starts N
 * streams from one node, keeps one card's worth of state per slot, and stops
 * one or all. Renders nothing.
 *
 * Results are saved as siblings as they finish. Choosing one is the chat's
 * ordinary "make current" (`useRewindToNode`), as for any sibling; the rest
 * stay in the tree.
 */
export const useParallelContinuations = (
  input: UseParallelContinuationsInput
) => {
  const { session, generateParallelContinuationsUseCase, credentialStore } =
    input;
  const onSlotSettledRef = useRef(input.onSlotSettled);
  onSlotSettledRef.current = input.onSlotSettled;
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
      onSlotSettledRef.current?.(event);
    },
    [flushNow, setText]
  );

  const start = useCallback(
    async (
      sourceNodeId: ULID,
      count: number
    ): Promise<GenerateParallelContinuationsResult | null> => {
      const model = session?.model;
      if (!session || !model || controlsRef.current) {
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
          model.provider
        );
        const result = await generateParallelContinuationsUseCase.execute({
          modelAgentId: model.modelAgentId,
          modelIdentifier: model.modelIdentifier,
          treeId: session.treeId,
          pathId: session.pathId,
          sourceNodeId,
          providerApiKey,
          providerAppName: 'Aspen Grove RN',
          count,
          signal: controls.all.signal,
          slotSignals: controls.perSlot.map((controller) => controller.signal),
          onSlotEvent: (event) =>
            onSlotEvent(describeSlotFailure(event, model.provider)),
        });
        flushNow();
        dispatch({ type: 'finished' });
        return result;
      } catch (caught) {
        discard();
        dispatch({
          type: 'failed',
          message: toMessage(caught, model.provider),
        });
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
    reset,
  };
};
