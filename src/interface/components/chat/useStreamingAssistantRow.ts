import { useCallback, useEffect, useRef, useState } from 'react';

const STREAM_FLUSH_INTERVAL_MS = 33;

/**
 * Buffers assistant deltas and flushes to React state at a controlled cadence.
 * Prevents one re-render per token while still feeling live.
 */
export const useStreamingAssistantRow = () => {
  const [streamingText, setStreamingText] = useState('');
  const bufferedTextRef = useRef('');
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    flushTimeoutRef.current = null;
    setStreamingText(bufferedTextRef.current);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      return;
    }
    flushTimeoutRef.current = setTimeout(flush, STREAM_FLUSH_INTERVAL_MS);
  }, [flush]);

  const appendDelta = useCallback(
    (delta: string) => {
      if (!delta) {
        return;
      }
      bufferedTextRef.current += delta;
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const reset = useCallback(() => {
    bufferedTextRef.current = '';
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setStreamingText('');
  }, []);

  useEffect(
    () => () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    },
    []
  );

  return {
    streamingText,
    appendDelta,
    reset,
  };
};
