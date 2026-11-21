/**
 * Per-request abort wiring for provider fetches.
 *
 * One controller per request, aborted by whichever comes first: the timeout
 * or the caller's `signal`. `cause()` tells the two apart so adapters can
 * report a user cancel as `cancelled` rather than `timeout`.
 *
 * Without `idleTimeoutMs`, `timeoutMs` bounds the whole request. With it,
 * `timeoutMs` bounds only the wait for the first activity (connect and
 * first byte), and each `markActivity()` re-arms the clock with
 * `idleTimeoutMs`: a stream that keeps arriving is never cut off, however
 * long it runs, and one that goes quiet for longer than the idle budget is.
 *
 * `dispose()` must run when the request ends (normally, on error, or when the
 * consumer stops iterating a stream early). It clears the timer, detaches
 * from the caller's signal and aborts the fetch, so an abandoned stream
 * doesn't keep its connection open.
 */
export type RequestAbort = {
  readonly signal: AbortSignal;
  readonly cause: () => 'timeout' | 'cancelled' | null;
  /** Bytes arrived: restart the idle clock (no-op without an idle budget). */
  readonly markActivity: () => void;
  readonly dispose: () => void;
};

export const createRequestAbort = (input: {
  readonly timeoutMs: number;
  readonly idleTimeoutMs?: number;
  readonly external?: AbortSignal;
}): RequestAbort => {
  const controller = new AbortController();
  let cause: 'timeout' | 'cancelled' | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const abortFor = (reason: 'timeout' | 'cancelled') => {
    if (cause === null) {
      cause = reason;
    }
    controller.abort();
  };

  const arm = (ms: number) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => abortFor('timeout'), ms);
  };

  const onExternalAbort = () => abortFor('cancelled');
  arm(input.timeoutMs);

  if (input.external?.aborted) {
    abortFor('cancelled');
  } else {
    input.external?.addEventListener('abort', onExternalAbort);
  }

  return {
    signal: controller.signal,
    cause: () => cause,
    markActivity: () => {
      if (input.idleTimeoutMs !== undefined && !controller.signal.aborted) {
        arm(input.idleTimeoutMs);
      }
    },
    dispose: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      input.external?.removeEventListener('abort', onExternalAbort);
      controller.abort();
    },
  };
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
