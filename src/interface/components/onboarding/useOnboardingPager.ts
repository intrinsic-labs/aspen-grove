import { useCallback, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useOpenOnPage } from './useOpenOnPage';

/**
 * The page shown and how to move between pages, for a paging ScrollView.
 * Opens on `startPage` once the pager's pages are laid out.
 */
export const useOnboardingPager = (pageCount: number, startPage: number) => {
  const pagerRef = useRef<ScrollView>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageWidth = pageSize.width;
  const [page, setPage] = useState(startPage);
  const { onContentSizeChange, onScroll, cancel } = useOpenOnPage({ pagerRef, page: startPage, pageWidth });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPageSize({ width, height });
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
    cancel();
    setPage(target);
    pagerRef.current?.scrollTo({ x: target * pageWidth, animated: true });
  }, [cancel, page, pageCount, pageWidth]);

  return {
    pagerRef,
    pageWidth,
    pageHeight: pageSize.height,
    page,
    isLastPage: page === pageCount - 1,
    onLayout,
    onPageSettled,
    onContentSizeChange,
    onScroll,
    onScrollBeginDrag: cancel,
    next,
  };
};
