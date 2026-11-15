/** Where a focused field and the keyboard are, in window points. */
export type RevealGeometry = {
  /** The bottom edge of the focused field. */
  readonly fieldBottom: number;
  /** The top edge of the keyboard (with any accessory bar). */
  readonly keyboardTop: number;
  /** The space to keep between them. */
  readonly gap: number;
  /** The scroll view's current vertical offset. */
  readonly scrollOffset: number;
};

/**
 * The scroll offset that lifts a focused field `gap` points above the
 * keyboard, or null when it already sits there.
 */
export const offsetToReveal = ({
  fieldBottom,
  keyboardTop,
  gap,
  scrollOffset,
}: RevealGeometry): number | null => {
  const overlap = fieldBottom + gap - keyboardTop;
  return overlap > 0.5 ? scrollOffset + overlap : null;
};
