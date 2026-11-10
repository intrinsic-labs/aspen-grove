import type { ULID } from '@domain/value-objects';

/**
 * Double-tap timing shared by the gestures that tell a single tap on a node
 * from a double: continuation cards, and message rows in Voice Mode.
 */

/** Two taps on the same node closer than this are a double-tap. */
export const DOUBLE_TAP_WINDOW_MS = 300;

/** A single tap acts just after the double-tap window has passed. */
export const SINGLE_TAP_DELAY_MS = 320;

export type NodeTap = {
  readonly nodeId: ULID;
  readonly atMs: number;
};

/** Whether a tap on `nodeId` at `nowMs` completes a double-tap. */
export const isDoubleTap = (
  lastTap: NodeTap | null,
  nodeId: ULID,
  nowMs: number
): boolean =>
  lastTap !== null &&
  lastTap.nodeId === nodeId &&
  nowMs - lastTap.atMs < DOUBLE_TAP_WINDOW_MS;
