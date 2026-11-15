import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

/**
 * Scrolls a section into view when it appears because of something the
 * user just did: `trigger` changes (a key saved, a connection test passed),
 * and the next section to lay out is scrolled to. A section that is there
 * from the start, or shows up as stored settings load, stays put, so the
 * page still opens at its top.
 */
export const useRevealOnAppear = (topInset: number, trigger: string) => {
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const firstTrigger = useRef(trigger);
  const pending = useRef(false);

  useEffect(() => {
    if (trigger !== firstTrigger.current) {
      pending.current = true;
    }
  }, [trigger]);

  const onSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!pending.current) {
        return;
      }
      pending.current = false;
      scrollRef.current?.scrollTo({
        y: Math.max(0, event.nativeEvent.layout.y - topInset),
        animated: true,
      });
    },
    [topInset]
  );

  return { scrollRef, onSectionLayout };
};
