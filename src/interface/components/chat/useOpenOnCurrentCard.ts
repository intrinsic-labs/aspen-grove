import { type RefObject, useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import {
  centeredRailCardOffset,
  currentRailCardIndex,
} from './rail-card-centering';
import type { RailCard } from './parallel/rail-cards';

/**
 * Opens the card row on the continuation the active path runs through,
 * centered, once per opening: the row mounts fresh each time the rail
 * opens, so a rail reopened after a branch switch centers the new current
 * card. Waits until both the row's width and its content's are known (on
 * Android the content can lay out after the row). Later changes (a reload,
 * a bookmark, a run's cards) leave the scroll where the reader put it, and
 * a row that opens with a run streaming leaves the scroll to that run.
 */
export const useOpenOnCurrentCard = (
  listRef: RefObject<ScrollView | null>,
  cards: readonly RailCard[],
  hasLiveRun: boolean
) => {
  const viewportWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const doneRef = useRef(false);
  const latestRef = useRef({ cards, hasLiveRun });
  latestRef.current = { cards, hasLiveRun };

  const tryOpen = useCallback(() => {
    const viewportWidth = viewportWidthRef.current;
    const contentWidth = contentWidthRef.current;
    if (doneRef.current || viewportWidth <= 0 || contentWidth <= 0) {
      return;
    }
    doneRef.current = true;
    const { cards: current, hasLiveRun: live } = latestRef.current;
    if (live) {
      return;
    }
    const x = centeredRailCardOffset({
      index: currentRailCardIndex(current),
      viewportWidth,
      contentWidth,
    });
    if (x > 0) {
      listRef.current?.scrollTo({ x, y: 0, animated: false });
    }
  }, [listRef]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      tryOpen();
    },
    [tryOpen]
  );

  const onContentSizeChange = useCallback(
    (width: number) => {
      contentWidthRef.current = width;
      tryOpen();
    },
    [tryOpen]
  );

  return { onLayout, onContentSizeChange };
};
