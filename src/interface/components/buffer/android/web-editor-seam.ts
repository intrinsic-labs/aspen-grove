import type { Replacement } from './web-editor-protocol';

/**
 * Where the seam (the end of the shared prefix) lands after one replacement
 * of `[from, to)` by `insert`. It mirrors `applyPreviewEdit`: an edit wholly
 * before the seam moves it, an edit starting at or after it leaves it (so
 * text inserted at the seam belongs to the ending), and an edit crossing it
 * gives its inserted text to the prefix, the owner of the selection start.
 */
export const mapSeam = (
  seam: number,
  { from, to, insert }: Replacement
): number => {
  if (from >= seam) {
    return seam;
  }
  if (to <= seam) {
    return seam + insert.length - (to - from);
  }
  return from + insert.length;
};

/** Replacements against one pre-edit document, in document order. */
export const mapSeamThrough = (
  seam: number,
  replacements: readonly Replacement[]
): number => {
  let shift = 0;
  let mapped = seam;
  for (const { from, to, insert } of replacements) {
    mapped = mapSeam(mapped, {
      from: from + shift,
      to: to + shift,
      insert,
    });
    shift += insert.length - (to - from);
  }
  return mapped;
};
