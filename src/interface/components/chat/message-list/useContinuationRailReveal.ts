import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { ULID } from '@domain/value-objects';
import { useLatestCallback } from '@/interface/hooks/useLatestCallback';
import type { ContinuationRailState } from './continuation-rail-state';
import { centeredRailOffset } from './rail-centering';
import type { ScrollMetrics } from './scroll-metrics';

/** How long a rail's layout gets to settle before it is centered. */
const RAIL_REVEAL_SETTLE_MS = 60;

type Layout = { y: number; height: number };

type ContinuationRailRevealOptions = {
  readonly continuationRail: ContinuationRailState;
  readonly headerHeight: number;
  readonly composerHeight: number;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly scrollMetricsRef: RefObject<ScrollMetrics>;
};

/**
 * Scrolls an opening continuation rail to the middle of the readable area.
 * Each rail is centered once, when it opens and its cards are in; later
 * layout changes (cards streaming, growing) leave the scroll alone. Rows and
 * rails report their layouts through the returned stable handlers.
 */
export const useContinuationRailReveal = ({
  continuationRail,
  headerHeight,
  composerHeight,
  scrollRef,
  scrollMetricsRef,
}: ContinuationRailRevealOptions) => {
  const rowLayoutsRef = useRef(new Map<string, Layout>());
  const railLayoutsRef = useRef(new Map<string, Layout>());
  const revealRailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const activeRailNodeId =
    continuationRail.visible && continuationRail.sourceNodeId
      ? continuationRail.sourceNodeId
      : null;

  const centeredRailRef = useRef<ULID | null>(null);
  const railLoadingRef = useRef(continuationRail.loading);
  railLoadingRef.current = continuationRail.loading;

  const revealContinuationRail = useCallback(
    (nodeId: ULID) => {
      if (centeredRailRef.current === nodeId) {
        return;
      }
      const rowLayout = rowLayoutsRef.current.get(nodeId);
      const railLayout = railLayoutsRef.current.get(nodeId);
      const { offsetY, viewportHeight, contentHeight } =
        scrollMetricsRef.current;
      if (!rowLayout || !railLayout || viewportHeight <= 0) {
        return;
      }

      const y = centeredRailOffset({
        railTop: rowLayout.y + railLayout.y,
        railHeight: railLayout.height,
        headerHeight,
        viewportHeight,
        composerHeight,
        contentHeight,
      });
      if (!railLoadingRef.current) {
        centeredRailRef.current = nodeId;
      }
      if (Math.abs(y - offsetY) > 1) {
        scrollRef.current?.scrollTo({ y, animated: true });
      }
    },
    [composerHeight, headerHeight, scrollMetricsRef, scrollRef]
  );

  const scheduleRailReveal = useCallback(
    (nodeId: ULID) => {
      if (revealRailTimeoutRef.current) {
        clearTimeout(revealRailTimeoutRef.current);
      }
      // Let the row, rail and content size report in before measuring.
      revealRailTimeoutRef.current = setTimeout(() => {
        revealContinuationRail(nodeId);
      }, RAIL_REVEAL_SETTLE_MS);
    },
    [revealContinuationRail]
  );

  useEffect(
    () => () => {
      if (revealRailTimeoutRef.current) {
        clearTimeout(revealRailTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeRailNodeId) {
      centeredRailRef.current = null;
      return;
    }
    if (centeredRailRef.current !== activeRailNodeId) {
      centeredRailRef.current = null;
    }
    scheduleRailReveal(activeRailNodeId);
  }, [activeRailNodeId, continuationRail.loading, scheduleRailReveal]);

  // Rows get stable handlers so a new closure here (on every rail or
  // composer change) doesn't re-render every message.
  const recordRowLayout = useLatestCallback(
    (nodeId: ULID, event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      rowLayoutsRef.current.set(nodeId, { y, height });
      if (activeRailNodeId === nodeId) {
        scheduleRailReveal(nodeId);
      }
    }
  );

  const recordRailLayout = useLatestCallback(
    (nodeId: ULID, event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      railLayoutsRef.current.set(nodeId, { y, height });
      if (activeRailNodeId === nodeId) {
        scheduleRailReveal(nodeId);
      }
    }
  );

  return { recordRowLayout, recordRailLayout };
};
