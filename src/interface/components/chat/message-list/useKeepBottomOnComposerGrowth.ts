import { type RefObject, useEffect, useRef } from 'react';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { offsetForComposerGrowth } from './list-insets';
import type { ScrollMetrics } from './scroll-metrics';

type KeepBottomOnComposerGrowthOptions = {
  readonly composerHeight: number;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly scrollMetricsRef: RefObject<ScrollMetrics>;
  readonly atBottomRef: RefObject<boolean>;
};

/**
 * The bottom padding follows the composer, but the offset doesn't: keep a
 * reader at the bottom there as a draft grows to several lines.
 */
export const useKeepBottomOnComposerGrowth = ({
  composerHeight,
  scrollRef,
  scrollMetricsRef,
  atBottomRef,
}: KeepBottomOnComposerGrowthOptions) => {
  const previousComposerHeightRef = useRef(composerHeight);

  useEffect(() => {
    const y = offsetForComposerGrowth({
      offsetY: scrollMetricsRef.current.offsetY,
      previousComposerHeight: previousComposerHeightRef.current,
      composerHeight,
      wasAtBottom: atBottomRef.current,
    });
    previousComposerHeightRef.current = composerHeight;
    if (y !== null) {
      scrollRef.current?.scrollTo({ y, animated: false });
    }
  }, [atBottomRef, composerHeight, scrollMetricsRef, scrollRef]);
};
