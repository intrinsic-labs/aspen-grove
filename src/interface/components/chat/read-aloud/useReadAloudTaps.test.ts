import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import { SINGLE_TAP_DELAY_MS } from '../node-actions/double-tap';
import { useReadAloudTaps } from './useReadAloudTaps';

const rowId = '01KROW00000000000000000000' as ULID;

const setup = (speaking: boolean) => {
  const onSingleTap = jest.fn((_nodeId: ULID) => {});
  const stopSpeaking = jest.fn(() => {});
  const readAloud = jest.fn((_nodeId: ULID) => {});
  const hook = renderHook(
    () =>
      useReadAloudTaps({
        onSingleTap,
        voiceModeEnabled: true,
        speaking,
        readAloud,
        stopSpeaking,
      }),
    undefined
  );
  return { hook, onSingleTap, stopSpeaking, readAloud };
};

describe('useReadAloudTaps (tap to stop speech)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('only stops speech, without opening the continuation rail', async () => {
    const { hook, onSingleTap, stopSpeaking } = setup(true);
    await act(() => {
      hook.result.current(rowId);
      jest.advanceTimersByTime(SINGLE_TAP_DELAY_MS);
    });
    expect(stopSpeaking).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('opens the rail on a tap while nothing is speaking', async () => {
    const { hook, onSingleTap, stopSpeaking } = setup(false);
    await act(() => {
      hook.result.current(rowId);
      jest.advanceTimersByTime(SINGLE_TAP_DELAY_MS);
    });
    expect(onSingleTap).toHaveBeenCalledWith(rowId);
    expect(stopSpeaking).not.toHaveBeenCalled();
  });
});
