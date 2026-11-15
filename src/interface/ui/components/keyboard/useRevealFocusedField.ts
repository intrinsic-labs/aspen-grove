import { type RefObject, useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  TextInput,
} from 'react-native';
import { offsetToReveal } from './reveal-offset';

type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

/**
 * Once the keyboard is up, scrolls the focused field to `gap` points above
 * it. Inside a page sheet, React Native measures from the sheet's top
 * rather than the screen's, so the keyboard's top is placed in the same
 * terms: its height up from the bottom of the scroll view, which runs to
 * the bottom of the sheet.
 */
export const useRevealFocusedField = (
  scrollRef: RefObject<ScrollView | null>,
  gap: number
) => {
  const offset = useRef(0);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const field =
        TextInput.State.currentlyFocusedInput() as Measurable | null;
      const scroll = scrollRef.current as Measurable | null;
      if (!field || !scroll) return;
      scroll.measureInWindow((_sx, scrollY, _sw, scrollHeight) => {
        field.measureInWindow((_x, y, _width, height) => {
          const next = offsetToReveal({
            fieldBottom: y + height,
            keyboardTop: scrollY + scrollHeight - event.endCoordinates.height,
            gap,
            scrollOffset: offset.current,
          });
          if (next !== null) {
            scrollRef.current?.scrollTo({ y: next, animated: true });
          }
        });
      });
    });
    return () => subscription.remove();
  }, [gap, scrollRef]);

  return useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);
};
