/**
 * Cluster boundaries for the edits a diff recovers. Native selection always
 * lands on a boundary, but a prefix/suffix diff does not: replacing one emoji
 * with another can share a high surrogate, and an accent swap shares its base
 * letter. A run edge inside either would draw half a glyph in one color.
 *
 * Hermes ships no `Intl.Segmenter`, so this recognizes the clusters that
 * matter in prose by explicit ranges: surrogate pairs, combining marks,
 * variation selectors, the emoji skin tones, ZWJ joins and tag characters.
 * Scripts that build clusters from spacing marks (Indic) fall outside it.
 */
const isHigh = (unit: number) => unit >= 0xd800 && unit <= 0xdbff;
const isLow = (unit: number) => unit >= 0xdc00 && unit <= 0xdfff;

const ZWJ = 0x200d;

const isExtender = (codePoint: number): boolean =>
  (codePoint >= 0x0300 && codePoint <= 0x036f) ||
  (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
  (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
  (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
  (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
  (codePoint >= 0xfe20 && codePoint <= 0xfe2f) ||
  codePoint === ZWJ ||
  (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
  (codePoint >= 0xe0020 && codePoint <= 0xe007f);

/** The code point starting at `index` (a lone surrogate counts as one). */
const codePointAt = (text: string, index: number): number =>
  text.codePointAt(index) ?? 0;

/** The code point that ends just before `index`. */
const codePointBefore = (text: string, index: number): number => {
  const unit = text.charCodeAt(index - 1);
  if (isLow(unit) && index >= 2 && isHigh(text.charCodeAt(index - 2))) {
    return text.codePointAt(index - 2) ?? unit;
  }
  return unit;
};

/** Whether `index` falls between two clusters of `text` (not inside one). */
export const isClusterBoundary = (text: string, index: number): boolean => {
  if (index <= 0 || index >= text.length) {
    return true;
  }
  if (isLow(text.charCodeAt(index)) && isHigh(text.charCodeAt(index - 1))) {
    return false;
  }
  return !(
    isExtender(codePointAt(text, index)) || codePointBefore(text, index) === ZWJ
  );
};

/** The nearest boundary at or before `index`. */
export const clusterStartAtOrBefore = (text: string, index: number): number => {
  let at = index;
  while (at > 0 && !isClusterBoundary(text, at)) {
    at -= 1;
  }
  return at;
};

/** The nearest boundary at or after `index`. */
export const clusterEndAtOrAfter = (text: string, index: number): number => {
  let at = index;
  while (at < text.length && !isClusterBoundary(text, at)) {
    at += 1;
  }
  return at;
};
