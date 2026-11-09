import { useCallback, useEffect, useRef } from 'react';

const FLUSH_INTERVAL_MS = 33;

/**
 * Collects each slot's latest streamed text and hands it over in batches, so
 * N concurrent streams cause one render per interval rather than one per
 * token per stream. `flushNow` delivers anything pending immediately (before
 * a slot settles, so its card never misses its last tokens).
 */
export const useBufferedSlotText = (
  onFlush: (texts: ReadonlyMap<number, string>) => void
) => {
  const pendingRef = useRef(new Map<number, string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFlushRef = useRef(onFlush);
  onFlushRef.current = onFlush;

  const flushNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current.size === 0) {
      return;
    }
    const texts = pendingRef.current;
    pendingRef.current = new Map();
    onFlushRef.current(texts);
  }, []);

  const setText = useCallback(
    (slot: number, content: string) => {
      pendingRef.current.set(slot, content);
      if (!timerRef.current) {
        timerRef.current = setTimeout(flushNow, FLUSH_INTERVAL_MS);
      }
    },
    [flushNow]
  );

  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = new Map();
  }, []);

  useEffect(() => discard, [discard]);

  return { setText, flushNow, discard };
};
