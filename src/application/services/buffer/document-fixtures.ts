import type { AuthorshipRun } from './authorship-runs';
import {
  type BufferDocument,
  type DocumentIndex,
  type Passage,
  indexDocument,
  materialize,
} from './document-ranges';

/**
 * Test data shared by the buffer reducer suites; nothing here ships. The
 * cluster strings are the ones the 1c editor suites use. `useSegmenter` relies
 * on Jest's globals.
 */
export const model = (text: string): AuthorshipRun => ({
  author: 'model',
  text,
});

export const human = (text: string): AuthorshipRun => ({
  author: 'human',
  text,
});

export const passage = (
  id: string,
  ...runs: readonly AuthorshipRun[]
): Passage => ({ id, runs });

export const documentOf = (
  passages: readonly Passage[],
  ...tail: readonly AuthorshipRun[]
): BufferDocument => ({ passages, tail });

export const indexOf = (
  passages: readonly Passage[],
  ...tail: readonly AuthorshipRun[]
): DocumentIndex => indexDocument(documentOf(passages, ...tail));

/** `[author, text]` pairs of the whole document, for compact assertions. */
export const pairs = (index: DocumentIndex): [string, string][] =>
  materialize(index).runs.map((run) => [run.author, run.text]);

/** Grapheme cases shared by the 1c tracking tests and the reducer suites. */
export const FAMILY = '👨‍👩‍👧';
export const GRIN = '😀';
export const BEAMING = '😁'; // shares GRIN's high surrogate
export const THUMB_MID = '👍🏽';
export const THUMB_DARK = '👍🏿';
export const E_ACUTE = 'é';
export const FLAGS = '🇺🇸🇫🇷'; // two regional-indicator pairs
export const HINDI_KI = 'कि'; // consonant plus a spacing vowel sign
export const HINDI_NAMASTE = 'नमस्ते';

const intl = Intl as unknown as { Segmenter?: unknown };
const nativeSegmenter = intl.Segmenter;

/** Both ways a runtime can segment: with `Intl.Segmenter`, and as Hermes does. */
export const SEGMENTER_PATHS: [string, boolean][] = [
  ['Intl.Segmenter', true],
  ['the explicit fallback (Hermes)', false],
];

/** In the enclosing describe, runs each test with or without `Intl.Segmenter`. */
export const useSegmenter = (enabled: boolean): void => {
  beforeEach(() => {
    intl.Segmenter = enabled ? nativeSegmenter : undefined;
  });
  afterEach(() => {
    intl.Segmenter = nativeSegmenter;
  });
};

export const hasNativeSegmenter = nativeSegmenter !== undefined;
