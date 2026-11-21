import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import type { ScrollView } from 'react-native';

/**
 * Brings a starting run's cards into view at the end of the row, including
 * a second run whose finished cards are still showing (the slot count alone
 * doesn't change then).
 *
 * On Android a `scrollToEnd` made as the cards mount, or as their layout
 * reaches JS (`onContentSizeChange`), can still find the native row at its
 * old width, before the new cards are mounted, and stop a card or more
 * short. So each scroll waits two frames, and the row keeps to its end
 * while the run's cards lay out, until the reader drags it or the run ends.
 */
export const useFollowNewRun = (
  listRef: RefObject<ScrollView | null>,
  liveSlotCount: number
) => {
  const shownLiveSlotCountRef = useRef(0);
  const followingRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  const scrollToEndSoon = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (followingRef.current) {
          listRef.current?.scrollToEnd({ animated: true });
        }
      });
    });
  }, [listRef]);

  useLayoutEffect(() => {
    if (liveSlotCount > shownLiveSlotCountRef.current) {
      followingRef.current = true;
      listRef.current?.scrollToEnd({ animated: true });
      scrollToEndSoon();
    } else if (liveSlotCount === 0) {
      followingRef.current = false;
    }
    shownLiveSlotCountRef.current = liveSlotCount;
  }, [listRef, liveSlotCount, scrollToEndSoon]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  const onContentSizeChange = useCallback(() => {
    if (followingRef.current) {
      scrollToEndSoon();
    }
  }, [scrollToEndSoon]);

  const onScrollBeginDrag = useCallback(() => {
    followingRef.current = false;
  }, []);

  return { onContentSizeChange, onScrollBeginDrag };
};
