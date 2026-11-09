import { describe, expect, it, jest } from '@jest/globals';
import { createRequestAbort } from './request-abort';

describe('createRequestAbort', () => {
  it('reports a caller abort as cancelled', () => {
    const caller = new AbortController();
    const abort = createRequestAbort({ timeoutMs: 60_000, external: caller.signal });

    caller.abort();

    expect(abort.signal.aborted).toBe(true);
    expect(abort.cause()).toBe('cancelled');
    abort.dispose();
  });

  it('reports the timer as timeout, and a later caller abort does not relabel it', () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const abort = createRequestAbort({ timeoutMs: 10, external: caller.signal });

    jest.advanceTimersByTime(10);
    caller.abort();

    expect(abort.cause()).toBe('timeout');
    abort.dispose();
    jest.useRealTimers();
  });

  it('aborts the request on dispose without blaming anyone', () => {
    const abort = createRequestAbort({ timeoutMs: 60_000 });

    abort.dispose();

    expect(abort.signal.aborted).toBe(true);
    expect(abort.cause()).toBeNull();
  });
});
