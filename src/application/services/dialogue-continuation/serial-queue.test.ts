import { describe, expect, it } from '@jest/globals';
import { linkAbortSignals } from './link-abort-signals';
import { createSerialQueue } from './serial-queue';

describe('createSerialQueue', () => {
  it('runs tasks one at a time in order, and a failure does not block later tasks', async () => {
    const queue = createSerialQueue();
    const log: string[] = [];
    let running = 0;
    const task = (name: string, fail = false) => async () => {
      running += 1;
      expect(running).toBe(1);
      log.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, 1));
      log.push(`end ${name}`);
      running -= 1;
      if (fail) {
        throw new Error(name);
      }
      return name;
    };

    const results = await Promise.allSettled([
      queue(task('a')),
      queue(task('b', true)),
      queue(task('c')),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ]);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });
});

describe('linkAbortSignals', () => {
  it('aborts when any source aborts, ignoring missing ones', () => {
    const one = new AbortController();
    const two = new AbortController();
    const linked = linkAbortSignals([one.signal, undefined, two.signal]);

    expect(linked.signal.aborted).toBe(false);
    two.abort();
    expect(linked.signal.aborted).toBe(true);
  });

  it('starts aborted when a source already is, and stops listening after dispose', () => {
    const done = new AbortController();
    done.abort();
    expect(linkAbortSignals([done.signal]).signal.aborted).toBe(true);

    const later = new AbortController();
    const linked = linkAbortSignals([later.signal]);
    linked.dispose();
    later.abort();
    expect(linked.signal.aborted).toBe(false);
  });
});
