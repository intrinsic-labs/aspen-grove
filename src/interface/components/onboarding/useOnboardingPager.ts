import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

/**
 * The page shown and how to move between pages, for a paging ScrollView.
 * Opens on `startPage` once the pager knows its width.
 */
export const useOnboardingPager = (pageCount: number, startPage: number) => {
  const pagerRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(startPage);

  useEffect(() => {
    if (pageWidth > 0 && startPage > 0) {
      pagerRef.current?.scrollTo({ x: startPage * pageWidth, animated: false });
    }
    // Only once measured: later pages come from swipes and Next.
  }, [pageWidth]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setPageWidth(event.nativeEvent.layout.width);
  }, []);

  const onPageSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth > 0) {
        setPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
      }
    },
    [pageWidth]
  );

  /** Next: `withAnimation { currentPage += 1 }`. */
  const next = useCallback(() => {
    const target = Math.min(page + 1, pageCount - 1);
    setPage(target);
    pagerRef.current?.scrollTo({ x: target * pageWidth, animated: true });
  }, [page, pageCount, pageWidth]);

  return {
    pagerRef,
    pageWidth,
    page,
    isLastPage: page === pageCount - 1,
    onLayout,
    onPageSettled,
    next,
  };
};
