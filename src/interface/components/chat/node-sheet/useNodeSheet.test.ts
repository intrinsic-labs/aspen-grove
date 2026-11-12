import { describe, expect, it, jest } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useNodeSheet } from './useNodeSheet';

const nodeId = '01KNODE0000000000000000000' as ULID;

const setup = () => {
  const actions = {
    rewindToNode: jest.fn(async (_nodeId: ULID) => {}),
    retraceBranch: jest.fn(async (_nodeId: ULID) => {}),
    copyNodeText: jest.fn(async (_nodeId: ULID) => {}),
    toggleBookmark: jest.fn(async (_nodeId: ULID) => {}),
    togglePrune: jest.fn(async (_nodeId: ULID) => {}),
    startEditForNode: jest.fn(async (_nodeId: ULID) => {}),
    renameBookmark: jest.fn(
      async (_nodeId: ULID, _label: string | undefined) => {}
    ),
  };
  const hook = renderHook(() => useNodeSheet(actions), undefined);
  return { hook, actions };
};

describe('useNodeSheet', () => {
  it('closes the continuation sheet when it makes the node current', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'continuation'));
    expect(hook.result.current.target).toEqual({
      nodeId,
      kind: 'continuation',
    });

    await act(() =>
      hook.result.current.onContinuationAction(nodeId, 'makeCurrent')
    );

    expect(actions.rewindToNode).toHaveBeenCalledWith(nodeId);
    expect(hook.result.current.target).toBeNull();
  });

  it('retraces from the continuation sheet', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'continuation'));
    await act(() =>
      hook.result.current.onContinuationAction(nodeId, 'retrace')
    );
    expect(actions.retraceBranch).toHaveBeenCalledWith(nodeId);
    expect(hook.result.current.target).toBeNull();
  });

  it('keeps Node Info open to copy, and starts an edit once it has gone', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'info'));

    await act(() => hook.result.current.onInfoAction(nodeId, 'copy'));
    expect(actions.copyNodeText).toHaveBeenCalledWith(nodeId);
    expect(hook.result.current.target).not.toBeNull();

    await act(() => hook.result.current.onInfoAction(nodeId, 'edit'));
    expect(hook.result.current.target).toBeNull();
    expect(actions.startEditForNode).not.toHaveBeenCalled();

    await act(() => hook.result.current.onDismissed());
    expect(actions.startEditForNode).toHaveBeenCalledWith(nodeId);
  });

  it('renames a bookmark and keeps its sheet open', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'bookmark'));
    await act(() =>
      hook.result.current.onBookmarkAction(nodeId, 'rename', 'Tools v1')
    );
    expect(actions.renameBookmark).toHaveBeenCalledWith(nodeId, 'Tools v1');
    expect(hook.result.current.target).not.toBeNull();
  });

  it('closes a bookmark sheet when its bookmark is removed', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'bookmark'));
    await act(() =>
      hook.result.current.onBookmarkAction(nodeId, 'bookmark', undefined)
    );
    expect(actions.toggleBookmark).toHaveBeenCalledWith(nodeId);
    expect(hook.result.current.target).toBeNull();
  });

  it('makes a bookmark current and closes its sheet', async () => {
    const { hook, actions } = setup();
    await act(() => hook.result.current.open(nodeId, 'bookmark'));
    await act(() =>
      hook.result.current.onBookmarkAction(nodeId, 'makeCurrent', undefined)
    );
    expect(actions.rewindToNode).toHaveBeenCalledWith(nodeId);
    expect(hook.result.current.target).toBeNull();
  });
});
