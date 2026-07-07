import { LlmProviderError } from './ILlmProvider';

export type SleepFn = (ms: number) => Promise<void>;

export type RetryOptions = {
  /** Maximum number of retries after the initial attempt. Defaults to 2. */
  readonly maxRetries?: number;
  /** Backoff delays in ms per retry. Defaults to [500, 1500]. */
  readonly backoffMs?: readonly number[];
  /** Injectable sleep, primarily for tests. Defaults to setTimeout. */
  readonly sleep?: SleepFn;
  /**
   * Decides whether a failed attempt should be retried.
   * Defaults to retrying only `LlmProviderError`s marked `retryable`.
   */
  readonly shouldRetry?: (error: unknown) => boolean;
};

export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_BACKOFF_MS: readonly number[] = [500, 1500];

const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableLlmError = (error: unknown): error is LlmProviderError =>
  error instanceof LlmProviderError && error.retryable;

/**
 * Runs `operation`, retrying failures the `shouldRetry` predicate accepts.
 *
 * Retries use exponential backoff (500ms, 1500ms by default). When the error
 * is a rate-limit carrying `retryAfterMs`, that provider hint takes precedence
 * over the backoff schedule.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    backoffMs = DEFAULT_BACKOFF_MS,
    sleep = defaultSleep,
    shouldRetry = isRetryableLlmError,
  } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const providerDelay =
        error instanceof LlmProviderError ? error.retryAfterMs : undefined;
      const delayMs =
        providerDelay ?? backoffMs[Math.min(attempt, backoffMs.length - 1)] ?? 0;
      await sleep(delayMs);
    }
  }
};
