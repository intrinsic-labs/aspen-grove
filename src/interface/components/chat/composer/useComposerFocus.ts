import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { ChatSession } from '../types';

type UseComposerFocusInput = {
  readonly shouldAutofocus: boolean;
  readonly loading: boolean;
  readonly session: ChatSession | null;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
};

/**
 * Owns the composer's input ref: focuses it once the session is ready when
 * the route asked for autofocus, and on demand (starting an edit).
 */
export const useComposerFocus = ({
  shouldAutofocus,
  loading,
  session,
  scrollRef,
}: UseComposerFocusInput) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!shouldAutofocus || loading || !session) {
      return;
    }

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 80);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, scrollRef, session, shouldAutofocus]);

  /** Focuses the composer and scrolls to the end on the next frame. */
  const focusComposerAtEnd = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [scrollRef]);

  return { inputRef, focusComposerAtEnd };
};
