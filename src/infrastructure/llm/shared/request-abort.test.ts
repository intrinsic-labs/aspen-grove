import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { createRequestAbort } from './request-abort';

describe('createRequestAbort', () => {
  it('reports a caller abort as cancelled', () => {
    const caller = new AbortController();
    const abort = createRequestAbort({
      timeoutMs: 60_000,
      external: caller.signal,
    });

    caller.abort();

    expect(abort.signal.aborted).toBe(true);
    expect(abort.cause()).toBe('cancelled');
    abort.dispose();
  });

  it('reports the timer as timeout, and a later caller abort does not relabel it', () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const abort = createRequestAbort({
      timeoutMs: 10,
      external: caller.signal,
    });

    jest.advanceTimersByTime(10);
    caller.abort();

    expect(abort.cause()).toBe('timeout');
    abort.dispose();
    jest.useRealTimers();
  });

  describe('with an idle budget', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('waits the first-byte budget before any activity', () => {
      const abort = createRequestAbort({ timeoutMs: 100, idleTimeoutMs: 20 });

      jest.advanceTimersByTime(99);
      expect(abort.signal.aborted).toBe(false);
      jest.advanceTimersByTime(1);

      expect(abort.cause()).toBe('timeout');
      abort.dispose();
    });

    it('restarts the clock with the idle budget on each activity', () => {
      const abort = createRequestAbort({ timeoutMs: 100, idleTimeoutMs: 20 });

      jest.advanceTimersByTime(90);
      abort.markActivity();
      // Well past the first-byte budget, but never 20 ms without activity.
      for (let i = 0; i < 10; i += 1) {
        jest.advanceTimersByTime(19);
        abort.markActivity();
      }
      expect(abort.signal.aborted).toBe(false);

      jest.advanceTimersByTime(20);
      expect(abort.cause()).toBe('timeout');
      abort.dispose();
    });

    it('ignores activity once aborted, and a cancel stays a cancel', () => {
      const caller = new AbortController();
      const abort = createRequestAbort({
        timeoutMs: 100,
        idleTimeoutMs: 20,
        external: caller.signal,
      });

      caller.abort();
      abort.markActivity();
      jest.advanceTimersByTime(200);

      expect(abort.cause()).toBe('cancelled');
      expect(jest.getTimerCount()).toBe(0);
      abort.dispose();
    });

    it('clears the idle timer on dispose', () => {
      const abort = createRequestAbort({ timeoutMs: 100, idleTimeoutMs: 20 });
      abort.markActivity();

      abort.dispose();

      expect(jest.getTimerCount()).toBe(0);
      expect(abort.cause()).toBeNull();
    });
  });

  it('keeps a total timeout when there is no idle budget', () => {
    jest.useFakeTimers();
    const abort = createRequestAbort({ timeoutMs: 50 });

    jest.advanceTimersByTime(40);
    abort.markActivity();
    jest.advanceTimersByTime(10);

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
