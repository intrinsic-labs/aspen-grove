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
import { SINGLE_TAP_DELAY_MS } from './double-tap';
import { useContinuationGestures } from './useContinuationGestures';

const cardNodeId = '01KCARD0000000000000000000' as ULID;

const setup = () => {
  const rewindToNode = jest.fn(async (_nodeId: ULID) => {});
  const retraceBranch = jest.fn(async (_nodeId: ULID) => {});
  const openContinuationSheet = jest.fn((_nodeId: ULID) => {});
  const hook = renderHook(
    () =>
      useContinuationGestures({
        continuations: { toggleBookmark: async () => {} },
        rewindToNode,
        retraceBranch,
        copyNodeText: async () => {},
        openContinuationSheet,
      }),
    undefined
  );
  return { hook, rewindToNode, retraceBranch, openContinuationSheet };
};

describe('useContinuationGestures (choosing a card)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('makes a card current on double tap, without opening its sheet', async () => {
    const { hook, rewindToNode, openContinuationSheet } = setup();

    await act(() => {
      hook.result.current.onContinuationSelect(cardNodeId);
      jest.advanceTimersByTime(100);
      hook.result.current.onContinuationSelect(cardNodeId);
      jest.advanceTimersByTime(SINGLE_TAP_DELAY_MS + 50);
    });

    expect(rewindToNode).toHaveBeenCalledWith(cardNodeId);
    expect(openContinuationSheet).not.toHaveBeenCalled();
  });

  it('opens the continuation sheet on a single tap, once the double-tap window passes', async () => {
    const { hook, rewindToNode, openContinuationSheet } = setup();

    await act(() => {
      hook.result.current.onContinuationSelect(cardNodeId);
      jest.advanceTimersByTime(SINGLE_TAP_DELAY_MS + 10);
    });

    expect(openContinuationSheet).toHaveBeenCalledWith(cardNodeId);
    expect(rewindToNode).not.toHaveBeenCalled();
  });

  it('makes a card current from its menu', async () => {
    const { hook, rewindToNode } = setup();

    await act(() =>
      hook.result.current.onContinuationMenuAction(cardNodeId, 'makeCurrent')
    );

    expect(rewindToNode).toHaveBeenCalledWith(cardNodeId);
  });

  it('retraces a card’s branch from its menu', async () => {
    const { hook, rewindToNode, retraceBranch } = setup();

    await act(() =>
      hook.result.current.onContinuationMenuAction(cardNodeId, 'retrace')
    );

    expect(retraceBranch).toHaveBeenCalledWith(cardNodeId);
    expect(rewindToNode).not.toHaveBeenCalled();
  });
});
