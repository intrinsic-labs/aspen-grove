import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { ScrollView } from 'react-native';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useFollowNewRun } from './useFollowNewRun';

/** Animation frames run by hand, one frame per `nextFrame()`. */
let frames = new Map<number, FrameRequestCallback>();
let nextId = 1;
const realRaf = globalThis.requestAnimationFrame;
const realCaf = globalThis.cancelAnimationFrame;

beforeEach(() => {
  frames = new Map();
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id?: number | null) => {
    if (id != null) {
      frames.delete(id);
    }
  };
});

afterEach(() => {
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCaf;
});

const nextFrame = () => {
  const due = [...frames.values()];
  frames = new Map();
  due.forEach((callback) => callback(0));
};
const twoFrames = () => {
  nextFrame();
  nextFrame();
};

const setup = (initialLiveSlots: number) => {
  const scrollToEnd = jest.fn();
  const listRef = { current: { scrollToEnd } as unknown as ScrollView };
  const hook = renderHook(
    ({ live }: { live: number }) => useFollowNewRun(listRef, live),
    { live: initialLiveSlots }
  );
  const contentChanged = () =>
    act(() => hook.result.current.onContentSizeChange());
  const drag = () => act(() => hook.result.current.onScrollBeginDrag());
  return { scrollToEnd, contentChanged, drag, ...hook };
};

describe('useFollowNewRun', () => {
  it('leaves a row with no run where it is', async () => {
    const { scrollToEnd, contentChanged } = setup(0);
    await contentChanged();
    twoFrames();
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('scrolls to a starting run at once and again two frames later', async () => {
    const { scrollToEnd, rerender } = setup(0);
    await rerender({ live: 3 });
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    nextFrame();
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    nextFrame();
    expect(scrollToEnd).toHaveBeenCalledTimes(2);
  });

  it('keeps to the end, two frames on, as the run lays out', async () => {
    const { scrollToEnd, contentChanged } = setup(3);
    twoFrames();
    await contentChanged();
    await contentChanged();
    twoFrames();
    // The two changes in one frame make one scroll.
    expect(scrollToEnd).toHaveBeenCalledTimes(3);
  });

  it('stops following once the reader drags the row', async () => {
    const { scrollToEnd, contentChanged, drag } = setup(3);
    await drag();
    twoFrames();
    await contentChanged();
    twoFrames();
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('keeps following while slots finish, stops when the run ends, and follows a second run', async () => {
    const { scrollToEnd, contentChanged, rerender } = setup(3);
    twoFrames();
    await rerender({ live: 1 });
    await contentChanged();
    twoFrames();
    expect(scrollToEnd).toHaveBeenCalledTimes(3);

    await rerender({ live: 0 });
    await contentChanged();
    twoFrames();
    expect(scrollToEnd).toHaveBeenCalledTimes(3);

    await rerender({ live: 2 });
    twoFrames();
    expect(scrollToEnd).toHaveBeenCalledTimes(5);
  });

  it('drops a scheduled scroll when the row unmounts', async () => {
    const { scrollToEnd, unmount } = setup(3);
    await unmount();
    twoFrames();
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
  });
});
