import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { ChatRow } from '../types';
import { isNearBottom } from './scroll-position';

type UseChatAutoScrollInput = {
  readonly rows: readonly ChatRow[];
  readonly loading: boolean;
  readonly sending: boolean;
  readonly streamingText: string;
};

/**
 * Keeps the message list pinned to its end while new content arrives,
 * unless the user scrolls up during a send. Actions that should bring the
 * list back to the end set `shouldAutoScrollRef.current = true`.
 */
export const useChatAutoScroll = ({
  rows,
  loading,
  sending,
  streamingText,
}: UseChatAutoScrollInput) => {
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const shouldAutoScrollRef = useRef(true);

  // The first rows after a load jump straight to the end: animating there
  // through a long path only delays the last message.
  const jumpOnNextRowsRef = useRef(true);

  useEffect(() => {
    if (loading) {
      jumpOnNextRowsRef.current = true;
      return;
    }
    if (!shouldAutoScrollRef.current) {
      return;
    }
    const animated = !jumpOnNextRowsRef.current;
    jumpOnNextRowsRef.current = false;
    scrollRef.current?.scrollToEnd({ animated });
  }, [rows, loading, sending]);

  useEffect(() => {
    if (streamingText.length === 0) {
      return;
    }
    if (!shouldAutoScrollRef.current) {
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [streamingText]);

  const onMessageListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isNearBottom(event.nativeEvent)) {
        shouldAutoScrollRef.current = true;
        return;
      }

      if (sending) {
        shouldAutoScrollRef.current = false;
      }
    },
    [sending]
  );

  const onComposerFocus = useCallback(() => {
    shouldAutoScrollRef.current = true;
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  return {
    scrollRef,
    shouldAutoScrollRef,
    onMessageListScroll,
    onComposerFocus,
  };
};
