import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { nativeMenuDismissal } from '@/interface/ui/components/native-menu-dismissal';
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

  /**
   * Focuses the composer with the caret after `text` and scrolls to the end,
   * once any native menu the request came from has finished closing (a
   * focus taken while it closes is lost; see `native-menu-dismissal.ts`).
   */
  const focusComposerAtEnd = useCallback(
    (text: string) => {
      nativeMenuDismissal.afterDismiss(() => {
        requestAnimationFrame(() => {
          const input = inputRef.current;
          input?.focus();
          input?.setSelection(text.length, text.length);
          scrollRef.current?.scrollToEnd({ animated: true });
        });
      });
    },
    [scrollRef]
  );

  return { inputRef, focusComposerAtEnd };
};
