import { splitGraphemes } from './text-boundaries';

/**
 * Splits prose into the tokens an authorship diff compares: words,
 * whitespace runs and punctuation runs. Every other grapheme cluster (an
 * emoji, a flag, a symbol) is a token of its own. Tokens always end on a
 * grapheme boundary, so a diff over them can never split a cluster, and
 * `tokenize(text).join('') === text`.
 *
 * `Intl.Segmenter` decides word boundaries where the runtime has it (Node,
 * Jest). Hermes ships none, so the explicit fallback decides there: a word
 * is a run of letters, digits and marks (an apostrophe between two of them
 * stays inside), and each Han ideograph or kana is a word of its own since
 * those scripts have no spaces. The two paths agree on spaced scripts and
 * differ on unspaced ones, which only changes how fine a CJK edit is drawn.
 */
type TokenClass = 'word' | 'space' | 'punct' | 'symbol';

type WordSegmenter = {
  segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};

type SegmenterConstructor = new (
  locale?: string,
  options?: { granularity: 'word' }
) => WordSegmenter;

let cached: { ctor: SegmenterConstructor; instance: WordSegmenter } | null =
  null;

const wordSegmenter = (): WordSegmenter | null => {
  const ctor = (Intl as unknown as { Segmenter?: SegmenterConstructor })
    .Segmenter;
  if (!ctor) {
    return null;
  }
  if (cached?.ctor !== ctor) {
    cached = {
      ctor,
      instance: new ctor(undefined, { granularity: 'word' }),
    };
  }
  return cached.instance;
};

const inRange = (cp: number, from: number, to: number) =>
  cp >= from && cp <= to;

const isSpace = (cluster: string): boolean => /^\s/.test(cluster);

/** Punctuation the way prose uses it: ASCII, general and CJK punctuation. */
const isPunctuation = (cp: number): boolean =>
  (inRange(cp, 0x21, 0x2f) && cp !== 0x24 && cp !== 0x2b) ||
  (inRange(cp, 0x3a, 0x40) && cp !== 0x3c && cp !== 0x3d && cp !== 0x3e) ||
  (inRange(cp, 0x5b, 0x60) && cp !== 0x5e && cp !== 0x60) ||
  cp === 0x7b ||
  cp === 0x7d ||
  cp === 0xa1 ||
  cp === 0xa7 ||
  cp === 0xab ||
  cp === 0xb6 ||
  cp === 0xb7 ||
  cp === 0xbb ||
  cp === 0xbf ||
  inRange(cp, 0x2010, 0x2027) ||
  inRange(cp, 0x2030, 0x205e) ||
  inRange(cp, 0x3001, 0x3003) ||
  inRange(cp, 0x3008, 0x3011) ||
  inRange(cp, 0xff01, 0xff0f) ||
  inRange(cp, 0xff1a, 0xff20);

const isIdeograph = (cp: number): boolean =>
  inRange(cp, 0x3040, 0x30ff) ||
  inRange(cp, 0x3400, 0x4dbf) ||
  inRange(cp, 0x4e00, 0x9fff) ||
  inRange(cp, 0xf900, 0xfaff) ||
  inRange(cp, 0x20000, 0x2fa1f);

/** Emoji and pictographs: symbols, never part of a word. */
const isPictograph = (cp: number): boolean =>
  inRange(cp, 0x1f000, 0x1faff) ||
  inRange(cp, 0x1f1e6, 0x1f1ff) ||
  inRange(cp, 0x2190, 0x2bff) ||
  inRange(cp, 0x2100, 0x218f) ||
  inRange(cp, 0xfe00, 0xfe0f);

const classOfCluster = (cluster: string): TokenClass => {
  if (isSpace(cluster)) {
    return 'space';
  }
  const cp = cluster.codePointAt(0) ?? 0;
  if (isPunctuation(cp)) {
    return 'punct';
  }
  if (
    isPictograph(cp) ||
    inRange(cp, 0x24, 0x24) ||
    cp === 0xa2 ||
    cp === 0xa9
  ) {
    return 'symbol';
  }
  if (
    inRange(cp, 0x2b, 0x2b) ||
    inRange(cp, 0x3c, 0x3e) ||
    cp === 0x5e ||
    cp === 0x60 ||
    cp === 0x7c ||
    cp === 0x7e
  ) {
    return 'symbol';
  }
  return 'word';
};

const isApostrophe = (cluster: string): boolean =>
  cluster === "'" || cluster === '’';

/** Tokens from the explicit rules: what Hermes runs. Exported so tests can pin it. */
export const tokenizeFallback = (text: string): string[] => {
  const clusters = splitGraphemes(text);
  const tokens: string[] = [];
  let current = '';
  let currentClass: TokenClass | null = null;
  const flush = () => {
    if (current.length > 0) {
      tokens.push(current);
    }
    current = '';
    currentClass = null;
  };
  clusters.forEach((cluster, at) => {
    let cls = classOfCluster(cluster);
    const cp = cluster.codePointAt(0) ?? 0;
    if (
      cls === 'punct' &&
      isApostrophe(cluster) &&
      currentClass === 'word' &&
      at + 1 < clusters.length &&
      classOfCluster(clusters[at + 1]) === 'word'
    ) {
      cls = 'word';
    }
    const alone = cls === 'symbol' || (cls === 'word' && isIdeograph(cp));
    if (alone || cls !== currentClass) {
      flush();
    }
    current += cluster;
    currentClass = cls;
    if (alone) {
      flush();
    }
  });
  flush();
  return tokens;
};

export const tokenize = (text: string): string[] => {
  const segmenter = wordSegmenter();
  if (!segmenter) {
    return tokenizeFallback(text);
  }
  const tokens: string[] = [];
  let mergeable: TokenClass | null = null;
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    const cls: TokenClass = isWordLike ? 'word' : classOfCluster(segment);
    if (cls === mergeable && (cls === 'space' || cls === 'punct')) {
      tokens[tokens.length - 1] += segment;
    } else {
      tokens.push(segment);
    }
    mergeable = cls;
  }
  return tokens;
};
