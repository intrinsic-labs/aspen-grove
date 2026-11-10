import { useCallback, useEffect, useRef } from 'react';
import type { ULID } from '@domain/value-objects';
import {
  SINGLE_TAP_DELAY_MS,
  isDoubleTap,
  type NodeTap,
} from '../node-actions/double-tap';

type UseReadAloudTapsInput = {
  /** The row's own single-tap action (toggle its continuation rail). */
  readonly onSingleTap: (nodeId: ULID) => void;
  readonly voiceModeEnabled: boolean;
  readonly speaking: boolean;
  readonly readAloud: (nodeId: ULID) => void;
  readonly stopSpeaking: () => void;
};

/**
 * Message-row taps with Voice Mode, as in Latent Spaces' `NodeView`: a tap
 * stops any speech and does the row's single-tap action; with Voice Mode on,
 * a double-tap reads the row aloud instead. Only with Voice Mode on is the
 * single tap held back for the double-tap window, so taps feel unchanged
 * with it off.
 */
export const useReadAloudTaps = ({
  onSingleTap,
  voiceModeEnabled,
  speaking,
  readAloud,
  stopSpeaking,
}: UseReadAloudTapsInput) => {
  const lastTapRef = useRef<NodeTap | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSingleTapTimer = useCallback(() => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const singleTap = useCallback(
    (nodeId: ULID) => {
      if (speaking) {
        stopSpeaking();
      }
      onSingleTap(nodeId);
    },
    [onSingleTap, speaking, stopSpeaking]
  );

  const onNodeTap = useCallback(
    (nodeId: ULID) => {
      if (!voiceModeEnabled) {
        singleTap(nodeId);
        return;
      }

      const nowMs = Date.now();
      clearSingleTapTimer();
      if (isDoubleTap(lastTapRef.current, nodeId, nowMs)) {
        lastTapRef.current = null;
        readAloud(nodeId);
        return;
      }
      lastTapRef.current = { nodeId, atMs: nowMs };
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        singleTap(nodeId);
      }, SINGLE_TAP_DELAY_MS);
    },
    [clearSingleTapTimer, readAloud, singleTap, voiceModeEnabled]
  );

  useEffect(() => clearSingleTapTimer, [clearSingleTapTimer]);

  return onNodeTap;
};
