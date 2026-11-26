/**
 * Grapheme-cluster boundaries for the buffer editor. Native selection always
 * lands on a boundary, but a diff does not: replacing one emoji with another
 * can share a high surrogate, an accent swap shares its base letter, and a
 * mark typed after a letter joins its cluster. A run edge inside any of them
 * would draw half a glyph in one color.
 *
 * `Intl.Segmenter` is used when the runtime has it (Node, Jest). Hermes ships
 * none, so on device the explicit fallback decides: surrogate pairs, CRLF,
 * combining marks, variation selectors, emoji skin tones, ZWJ joins, tag
 * characters, regional-indicator pairs, the Indic dependent signs and the
 * conjunct rule (a virama joining the next consonant) for the scripts Unicode
 * lists. Non-emoji ZWJ sequences are left to the segmenter.
 *
 * The segmenter is looked up at call time, so tests can exercise both paths.
 */
type Segmenter = {
  segment(text: string): {
    containing(index: number): { index: number; segment: string };
    [Symbol.iterator](): Iterator<{ segment: string }>;
  };
};

let cachedSegmenter: Segmenter | null = null;

const segmenter = (): Segmenter | null => {
  const ctor = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'grapheme' }
      ) => Segmenter;
    }
  ).Segmenter;
  if (!ctor) {
    return null;
  }
  cachedSegmenter ??= new ctor(undefined, { granularity: 'grapheme' });
  return cachedSegmenter;
};

const isHigh = (unit: number) => unit >= 0xd800 && unit <= 0xdbff;
const isLow = (unit: number) => unit >= 0xdc00 && unit <= 0xdfff;

const ZWJ = 0x200d;

const inRange = (cp: number, from: number, to: number) =>
  cp >= from && cp <= to;

const isRegionalIndicator = (cp: number) => inRange(cp, 0x1f1e6, 0x1f1ff);

/** Indic blocks lay their dependent signs out at matching offsets. */
const isIndicSign = (cp: number): boolean => {
  if (inRange(cp, 0x0d80, 0x0dff)) {
    // Sinhala
    return (
      inRange(cp, 0x0d81, 0x0d83) ||
      cp === 0x0dca ||
      inRange(cp, 0x0dcf, 0x0ddf) ||
      inRange(cp, 0x0df2, 0x0df3)
    );
  }
  if (!inRange(cp, 0x0900, 0x0d7f)) {
    return false;
  }
  const offset = cp & 0x7f;
  return (
    offset <= 0x03 ||
    (offset >= 0x3a && offset <= 0x4d && offset !== 0x3d) ||
    (inRange(cp, 0x0900, 0x097f) && (offset === 0x4e || offset === 0x4f)) ||
    (offset >= 0x55 && offset <= 0x57) ||
    offset === 0x62 ||
    offset === 0x63
  );
};

/** Scripts whose virama joins the consonant after it into one cluster. */
const CONJUNCT_BLOCKS = [0x0900, 0x0980, 0x0a80, 0x0b00, 0x0c00, 0x0d00];

const isConjunct = (before: number, after: number): boolean => {
  const block = before & ~0x7f;
  return (
    CONJUNCT_BLOCKS.includes(block) &&
    (before & 0x7f) === 0x4d &&
    (after & ~0x7f) === block &&
    inRange(after & 0x7f, 0x15, 0x39)
  );
};

const isExtender = (cp: number): boolean =>
  inRange(cp, 0x0300, 0x036f) ||
  inRange(cp, 0x1ab0, 0x1aff) ||
  inRange(cp, 0x1dc0, 0x1dff) ||
  inRange(cp, 0x20d0, 0x20ff) ||
  inRange(cp, 0xfe00, 0xfe0f) ||
  inRange(cp, 0xfe20, 0xfe2f) ||
  cp === ZWJ ||
  inRange(cp, 0x1f3fb, 0x1f3ff) ||
  inRange(cp, 0xe0020, 0xe007f) ||
  isIndicSign(cp);

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

/** Regional indicators in a row ending just before `index`. */
const indicatorsBefore = (text: string, index: number): number => {
  let count = 0;
  let at = index;
  while (at > 0 && isRegionalIndicator(codePointBefore(text, at))) {
    count += 1;
    at -= 2;
  }
  return count;
};

/** The explicit-range rules: what Hermes runs. Exported so tests can pin it. */
export const isFallbackClusterBoundary = (
  text: string,
  index: number
): boolean => {
  if (index <= 0 || index >= text.length) {
    return true;
  }
  if (isLow(text.charCodeAt(index)) && isHigh(text.charCodeAt(index - 1))) {
    return false;
  }
  if (text.charCodeAt(index - 1) === 0x0d && text.charCodeAt(index) === 0x0a) {
    return false;
  }
  const before = codePointBefore(text, index);
  const after = codePointAt(text, index);
  if (isRegionalIndicator(before) && isRegionalIndicator(after)) {
    return indicatorsBefore(text, index) % 2 === 0;
  }
  return !(isExtender(after) || before === ZWJ || isConjunct(before, after));
};

/** Whether `index` falls between two clusters of `text` (not inside one). */
export const isClusterBoundary = (text: string, index: number): boolean => {
  if (index <= 0 || index >= text.length) {
    return true;
  }
  const active = segmenter();
  if (!active) {
    return isFallbackClusterBoundary(text, index);
  }
  return active.segment(text).containing(index).index === index;
};

/** The nearest boundary at or before `index`. */
export const clusterStartAtOrBefore = (text: string, index: number): number => {
  let at = Math.min(Math.max(index, 0), text.length);
  while (at > 0 && !isClusterBoundary(text, at)) {
    at -= 1;
  }
  return at;
};

/** The nearest boundary at or after `index`. */
export const clusterEndAtOrAfter = (text: string, index: number): number => {
  let at = Math.min(Math.max(index, 0), text.length);
  while (at < text.length && !isClusterBoundary(text, at)) {
    at += 1;
  }
  return at;
};

/** `text` as its grapheme clusters, in order. */
export const splitGraphemes = (text: string): string[] => {
  const active = segmenter();
  if (active) {
    return Array.from(active.segment(text), (part) => part.segment);
  }
  const clusters: string[] = [];
  let from = 0;
  for (let at = 1; at <= text.length; at += 1) {
    if (isFallbackClusterBoundary(text, at)) {
      clusters.push(text.slice(from, at));
      from = at;
    }
  }
  return clusters;
};
