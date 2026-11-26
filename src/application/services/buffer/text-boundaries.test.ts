import { describe, expect, it } from '@jest/globals';
import {
  clusterEndAtOrAfter,
  clusterStartAtOrBefore,
  isClusterBoundary,
  isFallbackClusterBoundary,
  splitGraphemes,
} from './text-boundaries';
import {
  BEAMING,
  E_ACUTE,
  FAMILY,
  FLAGS,
  GRIN,
  HINDI_KI,
  HINDI_NAMASTE,
  THUMB_MID,
  SEGMENTER_PATHS,
  hasNativeSegmenter,
  useSegmenter,
} from './document-fixtures';

const CASES: [string, string[]][] = [
  ['abc', ['a', 'b', 'c']],
  [`a${GRIN}${BEAMING}`, ['a', GRIN, BEAMING]],
  [`a${FAMILY}b`, ['a', FAMILY, 'b']],
  [`${THUMB_MID}!`, [THUMB_MID, '!']],
  [`c${E_ACUTE}!`, ['c', E_ACUTE, '!']],
  [FLAGS, ['🇺🇸', '🇫🇷']],
  [`🇺🇸🇫🇷🇩🇪`, ['🇺🇸', '🇫🇷', '🇩🇪']],
  [`x${HINDI_KI}y`, ['x', HINDI_KI, 'y']],
  ['स्ते', ['स्ते']],
  ['a\r\nb', ['a', '\r\n', 'b']],
  ['', []],
];

describe.each(SEGMENTER_PATHS)(
  'grapheme boundaries via %s',
  (_name, useNative) => {
    useSegmenter(useNative);

    it.each(CASES)('splits %j into its clusters', (text, clusters) => {
      expect(splitGraphemes(text)).toEqual(clusters);
    });

    it('keeps a regional-indicator pair together and splits between pairs', () => {
      expect(isClusterBoundary(FLAGS, 2)).toBe(false);
      expect(isClusterBoundary(FLAGS, 4)).toBe(true);
      expect(isClusterBoundary(FLAGS, 6)).toBe(false);
      expect(isClusterBoundary(FLAGS, 8)).toBe(true);
    });

    it('never ends a cluster before an Indic spacing mark', () => {
      expect(isClusterBoundary(HINDI_KI, 1)).toBe(false);
      expect(splitGraphemes(HINDI_NAMASTE).join('')).toBe(HINDI_NAMASTE);
      expect(splitGraphemes(HINDI_NAMASTE).length).toBeLessThanOrEqual(4);
      expect(clusterEndAtOrAfter(HINDI_KI, 1)).toBe(2);
      expect(clusterStartAtOrBefore(HINDI_KI, 1)).toBe(0);
    });

    it('keeps surrogate pairs, ZWJ joins and combining marks whole', () => {
      expect(isClusterBoundary(GRIN, 1)).toBe(false);
      expect(isClusterBoundary(`a${FAMILY}`, 1 + 2)).toBe(false);
      expect(isClusterBoundary(`a${FAMILY}`, 1)).toBe(true);
      expect(clusterStartAtOrBefore(`caf${E_ACUTE}`, 4)).toBe(3);
      expect(clusterEndAtOrAfter(`caf${E_ACUTE}`, 4)).toBe(5);
    });

    it('treats the ends of the text as boundaries', () => {
      expect(isClusterBoundary(GRIN, 0)).toBe(true);
      expect(isClusterBoundary(GRIN, 2)).toBe(true);
    });
  }
);

describe('the explicit fallback agrees with Intl.Segmenter', () => {
  const corpus = [
    'plain words here',
    `a${GRIN}${BEAMING}b`,
    `${THUMB_MID}${E_ACUTE}`,
    `a${FAMILY}b`,
    FLAGS + '🇩🇪',
    `${HINDI_KI}${HINDI_NAMASTE}`,
    'ছোট বাংলা',
    'தமிழ் மொழி',
    'a\r\nb',
  ];

  it.each(corpus)('at every offset of %j', (text) => {
    if (!hasNativeSegmenter) {
      return;
    }
    for (let at = 0; at <= text.length; at += 1) {
      expect([text, at, isFallbackClusterBoundary(text, at)]).toEqual([
        text,
        at,
        isClusterBoundary(text, at),
      ]);
    }
  });
});
