import type { ULID } from '@domain/value-objects';

/** Two taps on the same card closer than this are a double-tap. */
export const CONTINUATION_DOUBLE_TAP_WINDOW_MS = 300;

/** A single tap acts just after the double-tap window has passed. */
export const CONTINUATION_SINGLE_TAP_DELAY_MS = 320;

export type ContinuationTap = {
  readonly nodeId: ULID;
  readonly atMs: number;
};

/** Whether a tap on `nodeId` at `nowMs` completes a double-tap. */
export const isContinuationDoubleTap = (
  lastTap: ContinuationTap | null,
  nodeId: ULID,
  nowMs: number
): boolean =>
  lastTap !== null &&
  lastTap.nodeId === nodeId &&
  nowMs - lastTap.atMs < CONTINUATION_DOUBLE_TAP_WINDOW_MS;
