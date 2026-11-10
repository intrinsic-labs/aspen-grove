import { useEffect, useState } from 'react';
import type { ChatRow } from '../types';
import {
  DEFAULT_PROGRESSIVE_ROWS_BUDGET,
  initialRowStart,
  nextRowStart,
  type ProgressiveRowsBudget,
} from './progressive-rows';

export type ProgressiveRows = {
  readonly rows: readonly ChatRow[];
  /** Every row is mounted; nothing more will be added above. */
  readonly complete: boolean;
};

/**
 * The rows to render now: the tail of the path on the first paint, then
 * a slice more above it after each frame (once `canGrow`) until every row
 * is mounted. Mount
 * it with the rows already loaded; once every row is in, later changes
 * (a new turn, a branch switch) render in full.
 */
export const useProgressiveRows = (
  rows: readonly ChatRow[],
  /** False holds the tail alone, e.g. while the screen slides in. */
  canGrow: boolean,
  budget: ProgressiveRowsBudget = DEFAULT_PROGRESSIVE_ROWS_BUDGET
): ProgressiveRows => {
  const [start, setStart] = useState(() => initialRowStart(rows, budget));
  const clampedStart = Math.min(start, rows.length);

  useEffect(() => {
    if (clampedStart === 0 || !canGrow) {
      return;
    }
    // Let the frame with the current rows reach the screen, then add more.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        setStart(nextRowStart(rows, clampedStart, budget));
      }, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [budget, canGrow, clampedStart, rows]);

  return clampedStart === 0
    ? { rows, complete: true }
    : { rows: rows.slice(clampedStart), complete: false };
};
