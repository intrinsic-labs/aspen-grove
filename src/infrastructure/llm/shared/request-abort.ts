/**
 * Per-request abort wiring for provider fetches.
 *
 * One controller per request, aborted by whichever comes first: the timeout
 * or the caller's `signal`. `cause()` tells the two apart so adapters can
 * report a user cancel as `cancelled` rather than `timeout`.
 *
 * `dispose()` must run when the request ends (normally, on error, or when the
 * consumer stops iterating a stream early). It clears the timer, detaches
 * from the caller's signal and aborts the fetch, so an abandoned stream
 * doesn't keep its connection open.
 */
export type RequestAbort = {
  readonly signal: AbortSignal;
  readonly cause: () => 'timeout' | 'cancelled' | null;
  readonly dispose: () => void;
};

export const createRequestAbort = (input: {
  readonly timeoutMs: number;
  readonly external?: AbortSignal;
}): RequestAbort => {
  const controller = new AbortController();
  let cause: 'timeout' | 'cancelled' | null = null;

  const abortFor = (reason: 'timeout' | 'cancelled') => {
    if (cause === null) {
      cause = reason;
    }
    controller.abort();
  };

  const onExternalAbort = () => abortFor('cancelled');
  const timeoutId = setTimeout(() => abortFor('timeout'), input.timeoutMs);

  if (input.external?.aborted) {
    abortFor('cancelled');
  } else {
    input.external?.addEventListener('abort', onExternalAbort);
  }

  return {
    signal: controller.signal,
    cause: () => cause,
    dispose: () => {
      clearTimeout(timeoutId);
      input.external?.removeEventListener('abort', onExternalAbort);
      controller.abort();
    },
  };
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
