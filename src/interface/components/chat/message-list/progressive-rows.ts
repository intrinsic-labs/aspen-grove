import type { ChatRow } from '../types';

/**
 * Tail-first rendering of a long path. A tree opens at the end of its path,
 * so the list first mounts only the last rows (about a screen and a half of
 * text), shows them, and then mounts the earlier rows a slice at a time
 * above them. Budgets are in characters of message text, a cheap stand-in
 * for rendered height and render cost (markdown and code dominate both).
 */
export type ProgressiveRowsBudget = {
  /** Characters to show in the first paint. */
  readonly initialChars: number;
  /** Characters to add per later slice. */
  readonly sliceChars: number;
  /** Rows in any slice, however short they are. */
  readonly minRows: number;
};

export const DEFAULT_PROGRESSIVE_ROWS_BUDGET: ProgressiveRowsBudget = {
  initialChars: 3000,
  sliceChars: 3000,
  minRows: 4,
};

/** Every row costs at least this much, so many tiny rows still split. */
const MIN_ROW_CHARS = 200;

const rowCost = (row: ChatRow): number =>
  Math.max(MIN_ROW_CHARS, row.text.length);

/**
 * The index to start rendering from so that the rows from it up to `end`
 * (exclusive) fill `chars`, with at least `minRows` of them.
 */
const sliceStart = (
  rows: readonly ChatRow[],
  end: number,
  chars: number,
  minRows: number
): number => {
  let start = end;
  let spent = 0;
  while (start > 0 && (end - start < minRows || spent < chars)) {
    start -= 1;
    spent += rowCost(rows[start]);
  }
  return start;
};

/** Where the first paint starts. */
export const initialRowStart = (
  rows: readonly ChatRow[],
  budget: ProgressiveRowsBudget = DEFAULT_PROGRESSIVE_ROWS_BUDGET
): number => sliceStart(rows, rows.length, budget.initialChars, budget.minRows);

/** Where the next slice starts, once the rows from `start` are mounted. */
export const nextRowStart = (
  rows: readonly ChatRow[],
  start: number,
  budget: ProgressiveRowsBudget = DEFAULT_PROGRESSIVE_ROWS_BUDGET
): number =>
  sliceStart(
    rows,
    Math.min(start, rows.length),
    budget.sliceChars,
    budget.minRows
  );
