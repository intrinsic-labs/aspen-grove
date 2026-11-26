import { describe, expect, it, jest } from '@jest/globals';
import { createCompositionBarrier } from '../composition-barrier';
import { bindNativeComposition } from './bind-native-composition';
import {
  COMPOSITION_CHANGE_EVENT,
  type BufferCompositionNative,
} from './buffer-composition-native';

/** A native module whose event the test fires and whose end it answers. */
const fakeNative = (wasComposing = true) => {
  let listener: (event: { composing: boolean }) => void = () => {};
  const remove = jest.fn();
  const endComposition = jest.fn(() => Promise.resolve(wasComposing));
  const native: BufferCompositionNative = {
    addListener: (event, next) => {
      expect(event).toBe(COMPOSITION_CHANGE_EVENT);
      listener = next;
      return { remove };
    },
    currentText: async () => null,
    endComposition,
  };
  return { native, emit: (composing: boolean) => listener({ composing }), remove, endComposition };
};

const setup = (wasComposing = true) => {
  const fake = fakeNative(wasComposing);
  const composition = { end: () => {} };
  let barrier = createCompositionBarrier({
    requestEnd: () => composition.end(),
    setTimer: () => 0,
    clearTimer: () => {},
  });
  const unbind = bindNativeComposition(fake.native, composition, (c) =>
    barrier.observe(c)
  );
  return { ...fake, composition, barrier, unbind };
};

describe('bindNativeComposition', () => {
  it('feeds the native marked-text state to the barrier', () => {
    const { emit, barrier } = setup();
    expect(barrier.isComposing()).toBe(false);
    emit(true);
    expect(barrier.isComposing()).toBe(true);
    emit(false);
    expect(barrier.isComposing()).toBe(false);
  });

  it('holds a load while composing, asks the input to end, and runs it on the answer', async () => {
    const { emit, barrier, endComposition } = setup();
    const load = jest.fn();
    emit(true);
    barrier.run(load);
    expect(load).not.toHaveBeenCalled();
    expect(endComposition).toHaveBeenCalledTimes(1);
    emit(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('runs a held load when the input says nothing was composing', async () => {
    const { emit, barrier } = setup(false);
    const load = jest.fn();
    emit(true);
    barrier.run(load);
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stops listening and ends nothing once unbound', () => {
    const { unbind, remove, composition, endComposition } = setup();
    unbind();
    expect(remove).toHaveBeenCalledTimes(1);
    composition.end();
    expect(endComposition).not.toHaveBeenCalled();
  });
});
