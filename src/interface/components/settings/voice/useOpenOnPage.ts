import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Layout widths are fractional on Android (392.727… for a page, 1178.18…
 * for three), so a page's end can sum to a hair past the content's; allow a
 * pixel's slack.
 */
const LAYOUT_SLACK = 1;

/**
 * Opens a horizontal pager on `page` each time it becomes visible.
 *
 * The scroll has to wait until the pages are laid out: Android clamps
 * `scrollTo` to the content width, so a scroll issued in the same commit that
 * first renders the pages lands on page 0 (iOS doesn't clamp, which hid this).
 * So the scroll is held until the content is wide enough to reach the page,
 * whichever comes last of opening, measuring the pager and sizing the content.
 * Pass the returned callback as the pager's `onContentSizeChange`.
 */
export const useOpenOnPage = (
  pagerRef: RefObject<ScrollView | null>,
  visible: boolean,
  pageWidth: number,
  page: number
) => {
  const pending = useRef(false);
  const contentWidth = useRef(0);

  const scrollIfReady = useCallback(() => {
    if (
      pending.current &&
      pageWidth > 0 &&
      contentWidth.current + LAYOUT_SLACK >= (page + 1) * pageWidth
    ) {
      pending.current = false;
      pagerRef.current?.scrollTo({ x: page * pageWidth, animated: false });
    }
  }, [page, pageWidth, pagerRef]);

  useEffect(() => {
    pending.current = visible;
    scrollIfReady();
    // Only when opened or measured, not on every swipe.
  }, [visible, pageWidth]);

  return useCallback(
    (width: number) => {
      contentWidth.current = width;
      scrollIfReady();
    },
    [scrollIfReady]
  );
};
