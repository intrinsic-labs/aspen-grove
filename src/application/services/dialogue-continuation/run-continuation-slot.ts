import {
  collectCompletion,
  LlmProviderError,
  type CompletionRequest,
  type CompletionResponse,
  type ILlmProvider,
  type RetryOptions,
} from '@application/services/llm';
import type {
  ContinuationSlot,
  ContinuationSlotListener,
  ContinuationSlotOutcome,
  PersistedContinuation,
} from './continuation-slot-events';

export type RunContinuationSlotInput = {
  readonly slot: ContinuationSlot;
  readonly llmProvider: ILlmProvider;
  /** The request for this slot alone, carrying this slot's abort signal. */
  readonly request: CompletionRequest;
  readonly retry?: RetryOptions;
  /** Saves a finished (or partial) completion as a model node. */
  readonly persist: (
    completion: CompletionResponse
  ) => Promise<PersistedContinuation>;
  readonly emit: ContinuationSlotListener;
};

const toErrorOutcome = (
  slot: ContinuationSlot,
  error: unknown
): ContinuationSlotOutcome => ({
  slot,
  type: 'error',
  message: error instanceof Error ? error.message : String(error),
  code: error instanceof LlmProviderError ? error.code : undefined,
});

const toSettledOutcome = (
  slot: ContinuationSlot,
  completion: CompletionResponse,
  saved: PersistedContinuation
): ContinuationSlotOutcome => {
  const reason = completion.interruptionReason;
  if (reason === 'cancelled') {
    return { slot, type: 'cancelled', saved };
  }
  if (reason) {
    return { ...saved, slot, type: 'interrupted', reason };
  }
  return { ...saved, slot, type: 'done' };
};

/**
 * Streams one continuation and saves it, settling into exactly one outcome.
 * Never rejects: every failure becomes an `error` or `cancelled` outcome, so
 * one slot can't take down the others started with it.
 *
 * Retry follows `collectCompletion`: only before the first chunk, and never
 * once this slot's signal has aborted.
 */
export const runContinuationSlot = async (
  input: RunContinuationSlotInput
): Promise<ContinuationSlotOutcome> => {
  const { slot, request } = input;

  let completion: CompletionResponse;
  try {
    completion = await collectCompletion({
      llmProvider: input.llmProvider,
      request,
      stream: true,
      retry: input.retry,
      onTextDelta: ({ delta, content }) =>
        input.emit({ slot, type: 'delta', delta, content }),
    });
  } catch (error) {
    if (request.signal?.aborted) {
      return { slot, type: 'cancelled' };
    }
    return toErrorOutcome(slot, error);
  }

  try {
    const saved = await input.persist(completion);
    return toSettledOutcome(slot, completion, saved);
  } catch (error) {
    return toErrorOutcome(slot, error);
  }
};
