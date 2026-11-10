import { useCallback, useEffect, useRef } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ContinuationMenuAction } from '../ContinuationRail';
import type { useNodeContinuations } from '../useNodeContinuations';
import { SINGLE_TAP_DELAY_MS, isDoubleTap, type NodeTap } from './double-tap';

type UseContinuationGesturesInput = {
  readonly continuations: Pick<
    ReturnType<typeof useNodeContinuations>,
    'toggleBookmark'
  >;
  readonly rewindToNode: (nodeId: ULID) => Promise<void>;
  readonly copyNodeText: (nodeId: ULID) => Promise<void>;
  readonly openNodeDetail: (nodeId: ULID) => void;
};

/**
 * Continuation-card gestures: single-tap opens node details; double-tap
 * retraces that branch (makes it current). The single-tap action is deferred
 * just past the double-tap window so a double never opens details first.
 * The card's menu makes it current, copies it or bookmarks it.
 */
export const useContinuationGestures = ({
  continuations,
  rewindToNode,
  copyNodeText,
  openNodeDetail,
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
        openNodeDetail(nodeId);
      }, SINGLE_TAP_DELAY_MS);
    },
    [openNodeDetail, rewindToNode]
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
      if (action === 'copy') {
        await copyNodeText(targetNodeId);
        return;
      }
      if (action === 'bookmark') {
        await continuations.toggleBookmark(targetNodeId);
      }
    },
    [continuations, copyNodeText, rewindToNode]
  );

  return { onContinuationSelect, onContinuationMenuAction };
};
