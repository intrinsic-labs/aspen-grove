import { type RefObject, useEffect } from 'react';
import {
  KeyboardEvents,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import {
  isAtListBottom,
  keyboardExtraSpace,
  keyboardRestingOffset,
} from './list-insets';
import type { ScrollMetrics } from './scroll-metrics';

type RestAboveKeyboardOptions = {
  readonly bottomInset: number;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly scrollMetricsRef: RefObject<ScrollMetrics>;
};

/**
 * Once the keyboard is up, settle a reader at the end of the tree
 * where `keyboardRestingOffset` puts them: a short tree moves only by what
 * the keyboard covers, a long one keeps its last line above the composer.
 * The keyboard's space reaches the list as it opens, after the composer's
 * focus scroll has run, hence the second scroll here.
 */
export const useRestAboveKeyboard = ({
  bottomInset,
  scrollRef,
  scrollMetricsRef,
}: RestAboveKeyboardOptions) => {
  useEffect(() => {
    const subscription = KeyboardEvents.addListener(
      'keyboardDidShow',
      (event) => {
        // Read now, not from the last scroll: a short tree never scrolls,
        // and the composer's focus scroll may have just moved the list.
        const metrics = scrollMetricsRef.current;
        if (!isAtListBottom(metrics)) {
          return;
        }
        const { contentHeight, viewportHeight } = metrics;
        scrollRef.current?.scrollTo({
          y: keyboardRestingOffset({
            contentHeight,
            viewportHeight,
            keyboardSpace: event.height + keyboardExtraSpace(bottomInset),
          }),
          animated: true,
        });
      }
    );
    return () => subscription.remove();
  }, [bottomInset, scrollMetricsRef, scrollRef]);
};
