export type BranchDots = {
  /** How many dots to draw (at most `max`). */
  readonly visible: number;
  /** Which drawn dot is the current branch. */
  readonly activeSlot: number;
};

/**
 * The dot row for a branch control: one dot per sibling, capped at `max` so
 * many siblings never overflow. Past the cap the row is a window that slides
 * to keep the current sibling inside it.
 */
export const branchDots = (
  count: number,
  index: number,
  max: number
): BranchDots => {
  const visible = Math.max(0, Math.min(count, max));
  const current = Math.max(0, Math.min(index, count - 1));
  const first = Math.max(
    0,
    Math.min(current - Math.floor(visible / 2), count - visible)
  );
  return { visible, activeSlot: current - first };
};
