import { describe, expect, it, jest } from '@jest/globals';
import type { Edge, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useNodeContinuations } from './useNodeContinuations';

const nodeA = 'node-a' as ULID;
const nodeB = 'node-b' as ULID;
const childOfA = 'child-of-a' as ULID;

const textNode = (id: ULID, text: string): Node =>
  ({
    id,
    localId: id.slice(-4),
    content: { type: 'text', text },
    metadata: { bookmarked: false },
    createdAt: new Date(0),
  }) as unknown as Node;

const continuationTo = (targetNodeId: ULID): Edge =>
  ({ edgeType: 'continuation', targetNodeId }) as unknown as Edge;

const gate = () => {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
};

/** Repos whose edge lookups wait on a gate, so a load can be overtaken. */
const setup = () => {
  let edgesGate: Promise<void> = Promise.resolve();
  const edgeRepo = {
    findBySourceNodeId: jest.fn(async (nodeId: ULID) => {
      await edgesGate;
      return nodeId === nodeA ? [continuationTo(childOfA)] : [];
    }),
  };
  const nodeRepo = {
    findById: jest.fn(async (nodeId: ULID) =>
      textNode(nodeId, `text ${nodeId}`)
    ),
    updateMetadata: jest.fn(async () => textNode(nodeA, '')),
  };
  const pathRepo = { getNodeSequence: jest.fn(async () => []) };
  const rawApiResponseRepo = {
    findModelIdentifiersByNodeIds: async () => new Map<ULID, string>(),
  };
  const agentRepo = { findById: async () => null };
  const onBookmarkChanged = jest.fn(() => {});
  const hook = renderHook(
    () =>
      useNodeContinuations({
        edgeRepo,
        nodeRepo,
        pathRepo,
        rawApiResponseRepo,
        agentRepo,
        pathId: 'path' as ULID,
        onBookmarkChanged,
      }),
    {}
  );
  return {
    hook,
    edgeRepo,
    nodeRepo,
    onBookmarkChanged,
    holdEdges: (held: Promise<void>) => {
      edgesGate = held;
    },
  };
};

describe('useNodeContinuations', () => {
  it('does not reopen a rail closed while its reload was in flight', async () => {
    const { hook, holdEdges } = setup();
    await act(() => hook.result.current.showForNode(nodeA));
    expect(hook.result.current.items).toHaveLength(1);

    const held = gate();
    holdEdges(held.opened);
    let reloading: Promise<void> = Promise.resolve();
    await act(async () => {
      reloading = hook.result.current.refreshIfShowing(nodeA);
    });
    await act(() => hook.result.current.hide());
    await act(async () => {
      held.open();
      await reloading;
    });

    expect(hook.result.current.visible).toBe(false);
    expect(hook.result.current.sourceNodeId).toBeNull();
    expect(hook.result.current.items).toEqual([]);
  });

  it('does not replace a node the user moved to while the old one reloaded', async () => {
    const { hook, holdEdges } = setup();
    await act(() => hook.result.current.showForNode(nodeA));

    const held = gate();
    holdEdges(held.opened);
    let reloading: Promise<void> = Promise.resolve();
    await act(async () => {
      reloading = hook.result.current.refreshIfShowing(nodeA);
    });
    holdEdges(Promise.resolve());
    await act(() => hook.result.current.showForNode(nodeB));
    await act(async () => {
      held.open();
      await reloading;
    });

    expect(hook.result.current.sourceNodeId).toBe(nodeB);
    expect(hook.result.current.items).toEqual([]); // B's (none), not A's
  });

  it('refreshes only the node the rail is showing', async () => {
    const { hook, edgeRepo } = setup();
    await act(() => hook.result.current.refreshIfShowing(nodeA));
    expect(edgeRepo.findBySourceNodeId).not.toHaveBeenCalled();
    expect(hook.result.current.visible).toBe(false);

    await act(() => hook.result.current.showForNode(nodeB));
    await act(() => hook.result.current.refreshIfShowing(nodeA));
    expect(hook.result.current.sourceNodeId).toBe(nodeB);
    expect(edgeRepo.findBySourceNodeId).toHaveBeenCalledTimes(1);
  });

  it('announces a card’s bookmark change, so the tree menu’s list reloads', async () => {
    const { hook, nodeRepo, onBookmarkChanged } = setup();
    await act(() => hook.result.current.showForNode(nodeA));

    await act(() => hook.result.current.toggleBookmark(childOfA));

    expect(nodeRepo.updateMetadata).toHaveBeenCalledWith(childOfA, {
      bookmarked: true,
    });
    expect(onBookmarkChanged).toHaveBeenCalledTimes(1);
  });
});
