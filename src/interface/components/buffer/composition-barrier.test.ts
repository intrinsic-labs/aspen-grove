import { createCompositionBarrier } from './composition-barrier';

/** A manual clock: timers fire only when the test advances it. */
const makeClock = () => {
  let now = 0;
  let next = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    setTimer: (callback: () => void, ms: number) => {
      timers.set(next, { at: now + ms, callback });
      return next++;
    },
    clearTimer: (handle: unknown) => void timers.delete(handle as number),
    advance: (ms: number) => {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].callback();
      }
      now = target;
    },
  };
};

const setup = () => {
  const clock = makeClock();
  const requestEnd = jest.fn();
  const barrier = createCompositionBarrier({ requestEnd, ...clock });
  return { clock, requestEnd, barrier };
};

describe('composition barrier', () => {
  it('runs at once when nothing is composing', () => {
    const { barrier } = setup();
    const action = jest.fn();
    barrier.run(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('asks the editor to end its composition at once and runs on its answer', () => {
    const { barrier, clock, requestEnd } = setup();
    const action = jest.fn();
    barrier.observe(true);
    barrier.run(action);
    expect(requestEnd).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
    clock.advance(100);
    barrier.observe(false);
    expect(action).toHaveBeenCalledTimes(1);
    clock.advance(5000);
    expect(action).toHaveBeenCalledTimes(1);
    expect(requestEnd).toHaveBeenCalledTimes(1);
  });

  it('runs the action after the fallback if the editor never answers', () => {
    const { barrier, clock } = setup();
    const action = jest.fn();
    barrier.observe(true);
    barrier.run(action);
    clock.advance(399);
    expect(action).not.toHaveBeenCalled();
    clock.advance(1);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('lets the latest action win, asks once and runs it once', () => {
    const { barrier, requestEnd } = setup();
    const first = jest.fn();
    const second = jest.fn();
    barrier.observe(true);
    barrier.run(first);
    barrier.run(second);
    expect(requestEnd).toHaveBeenCalledTimes(1);
    barrier.observe(false);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('forgets a held action and composing state on reset', () => {
    const { barrier, clock } = setup();
    const action = jest.fn();
    barrier.observe(true);
    barrier.run(action);
    barrier.reset();
    clock.advance(5000);
    expect(action).not.toHaveBeenCalled();
    expect(barrier.isComposing()).toBe(false);
  });
});
