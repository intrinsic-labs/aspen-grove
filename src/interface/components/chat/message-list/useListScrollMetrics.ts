import { useCallback, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { isAtListBottom } from './list-insets';
import type { ScrollMetrics } from './scroll-metrics';

/**
 * Tracks the list's scroll offset, viewport and content height in a ref (no
 * re-render per scroll event), and whether the reader was at the end of the
 * tree when they last scrolled. Hand the returned handlers to the scroll view.
 */
export const useListScrollMetrics = (
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
) => {
  const scrollMetricsRef = useRef<ScrollMetrics>({
    offsetY: 0,
    viewportHeight: 0,
    contentHeight: 0,
  });
  // Read when the composer grows, before the new padding is measured.
  const atBottomRef = useRef(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      scrollMetricsRef.current = {
        offsetY: contentOffset.y,
        viewportHeight: layoutMeasurement.height,
        contentHeight: event.nativeEvent.contentSize.height,
      };
      atBottomRef.current = isAtListBottom(scrollMetricsRef.current);
      onScroll(event);
    },
    [onScroll]
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      scrollMetricsRef.current = {
        ...scrollMetricsRef.current,
        contentHeight: height,
      };
    },
    []
  );

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    scrollMetricsRef.current = {
      ...scrollMetricsRef.current,
      viewportHeight: event.nativeEvent.layout.height,
    };
  }, []);

  return {
    scrollMetricsRef,
    atBottomRef,
    handleScroll,
    handleContentSizeChange,
    handleScrollLayout,
  };
};
