import { describe, expect, it } from '@jest/globals';
import {
  FAMILY,
  FLAGS,
  SEGMENTER_PATHS,
  useSegmenter,
} from './document-fixtures';
import { tokenize } from './text-tokens';

describe.each(SEGMENTER_PATHS)('tokenize with %s', (_name, useNative) => {
  useSegmenter(useNative);

  it('splits words, whitespace runs and punctuation runs', () => {
    expect(tokenize("Don't stop...  now!")).toEqual([
      "Don't",
      ' ',
      'stop',
      '...',
      '  ',
      'now',
      '!',
    ]);
  });

  it('is lossless and never splits a cluster', () => {
    const text = `a ${FAMILY} b ${FLAGS}\n\ncafé की`;
    const tokens = tokenize(text);
    expect(tokens.join('')).toBe(text);
    expect(tokens).toContain(FAMILY);
    expect(tokens).toContain('🇺🇸');
    expect(tokens).toContain('🇫🇷');
    expect(tokens).toContain('की');
  });

  it('is empty for an empty string', () => {
    expect(tokenize('')).toEqual([]);
  });
});
