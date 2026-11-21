import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

/** Frames to keep re-sending the scroll before giving up. */
const MAX_ATTEMPT_FRAMES = 60;

/**
 * Opens a paging ScrollView on `page`, and makes sure it gets there.
 *
 * A `scrollTo` sent as soon as the pager is measured can land before its
 * pages exist natively. On Android, view commands run ahead of the mount
 * items committed with them, so the scroll finds no content, stays at x 0
 * and is parked as a pending offset that only the scroll view's own
 * `onLayout` re-applies; adding the pages doesn't trigger that layout, so the
 * pager opened on page 1 whenever the two landed in the same batch.
 *
 * So the scroll is sent once the content is wide enough to hold the page
 * (`onContentSizeChange`), and re-sent each frame until a scroll event
 * reports the pager there. A drag by the user ends it.
 */
export const useOpenOnPage = ({
  pagerRef,
  page,
  pageWidth,
}: {
  readonly pagerRef: RefObject<ScrollView | null>;
  readonly page: number;
  readonly pageWidth: number;
}) => {
  const pendingRef = useRef<number | null>(page > 0 ? page : null);
  const frameRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    pendingRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  const send = useCallback(
    (framesLeft: number) => {
      frameRef.current = null;
      const target = pendingRef.current;
      if (target === null || pageWidth <= 0) {
        return;
      }
      pagerRef.current?.scrollTo({ x: target * pageWidth, animated: false });
      if (framesLeft > 0) {
        frameRef.current = requestAnimationFrame(() => send(framesLeft - 1));
      }
    },
    [pagerRef, pageWidth]
  );

  const onContentSizeChange = useCallback(
    (contentWidth: number) => {
      const target = pendingRef.current;
      if (
        target === null ||
        pageWidth <= 0 ||
        contentWidth < (target + 1) * pageWidth - 1 ||
        frameRef.current !== null
      ) {
        return;
      }
      send(MAX_ATTEMPT_FRAMES);
    },
    [pageWidth, send]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const target = pendingRef.current;
      if (
        target !== null &&
        Math.abs(event.nativeEvent.contentOffset.x - target * pageWidth) < 1
      ) {
        stop();
      }
    },
    [pageWidth, stop]
  );

  /** `cancel`: the user moved the pager (a drag, or Next). */
  return { onContentSizeChange, onScroll, cancel: stop };
};
