import type {
  ILlmProvider,
  ProviderRequest,
  RetryOptions,
  CompletionResponse,
} from '@application/services/llm';
import {
  type ContinuationSlotListener,
  type ContinuationSlotOutcome,
  type PersistedContinuation,
} from './continuation-slot-events';
import { linkAbortSignals } from './link-abort-signals';
import { runContinuationSlot } from './run-continuation-slot';
import { createSerialQueue } from './serial-queue';

export type RunContinuationSlotsInput = {
  readonly count: number;
  readonly llmProvider: ILlmProvider;
  readonly request: ProviderRequest;
  readonly signal?: AbortSignal;
  readonly slotSignals?: readonly (AbortSignal | undefined)[];
  readonly retry?: RetryOptions;
  readonly onSlotEvent?: ContinuationSlotListener;
  readonly persist: (
    slot: number,
    completion: CompletionResponse
  ) => Promise<PersistedContinuation>;
};

/** A listener failure is a rendering concern, never a generation failure. */
const safeListener =
  (listener?: ContinuationSlotListener): ContinuationSlotListener =>
  (event) => {
    try {
      listener?.(event);
    } catch {
      // Keep every slot independent from its observer.
    }
  };

/**
 * Runs independent streaming requests concurrently and serializes only their
 * persistence callbacks. Outcomes retain slot order regardless of settlement
 * order. Setup belongs to the caller and must finish before this is invoked.
 */
export const runContinuationSlots = async (
  input: RunContinuationSlotsInput
): Promise<readonly ContinuationSlotOutcome[]> => {
  const emit = safeListener(input.onSlotEvent);
  const persistInTurn = createSerialQueue();

  return Promise.all(
    Array.from({ length: input.count }, async (_, slot) => {
      const linked = linkAbortSignals([
        input.signal,
        input.slotSignals?.[slot],
      ]);
      try {
        const outcome = await runContinuationSlot({
          slot,
          llmProvider: input.llmProvider,
          request: { ...input.request, signal: linked.signal },
          retry: input.retry,
          persist: (completion) =>
            persistInTurn(() => input.persist(slot, completion)),
          emit,
        });
        emit(outcome);
        return outcome;
      } finally {
        linked.dispose();
      }
    })
  );
};
