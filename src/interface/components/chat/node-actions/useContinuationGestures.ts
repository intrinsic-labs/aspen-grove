import { useCallback, useEffect, useRef } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { useNodeContinuations } from '../useNodeContinuations';
import { SINGLE_TAP_DELAY_MS, isDoubleTap, type NodeTap } from './double-tap';

type UseContinuationGesturesInput = {
  readonly continuations: Pick<
    ReturnType<typeof useNodeContinuations>,
    'toggleBookmark'
  >;
  readonly rewindToNode: (nodeId: ULID) => Promise<void>;
  readonly retraceBranch: (nodeId: ULID) => Promise<void>;
  readonly copyNodeText: (nodeId: ULID) => Promise<void>;
  /** Opens the card's "Continuation Node" sheet. */
  readonly openContinuationSheet: (nodeId: ULID) => void;
};

/**
 * Continuation-card gestures, as in Latent Spaces' ChildNodeView: a tap
 * expands the card into its sheet; a double tap makes it current. The
 * single tap waits out the double-tap window so a double never opens the
 * sheet first. The card's menu makes it current, retraces its branch,
 * copies it or bookmarks it.
 */
export const useContinuationGestures = ({
  continuations,
  rewindToNode,
  retraceBranch,
  copyNodeText,
  openContinuationSheet,
}: UseContinuationGesturesInput) => {
  const lastTapRef = useRef<NodeTap | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onContinuationSelect = useCallback(
    (nodeId: ULID) => {
      const nowMs = Date.now();
      if (isDoubleTap(lastTapRef.current, nodeId, nowMs)) {
        lastTapRef.current = null;
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        void rewindToNode(nodeId);
        return;
      }
      lastTapRef.current = {
        nodeId,
        atMs: nowMs,
      };
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        openContinuationSheet(nodeId);
      }, SINGLE_TAP_DELAY_MS);
    },
    [openContinuationSheet, rewindToNode]
  );

  useEffect(
    () => () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    },
    []
  );

  const onContinuationMenuAction = useCallback(
    async (targetNodeId: ULID, action: ContinuationMenuAction) => {
      if (action === 'makeCurrent') {
        await rewindToNode(targetNodeId);
        return;
      }
      if (action === 'retrace') {
        await retraceBranch(targetNodeId);
        return;
      }
      if (action === 'copy') {
        await copyNodeText(targetNodeId);
        return;
      }
      if (action === 'bookmark') {
        await continuations.toggleBookmark(targetNodeId);
      }
    },
    [continuations, copyNodeText, retraceBranch, rewindToNode]
  );

  return { onContinuationSelect, onContinuationMenuAction };
};
