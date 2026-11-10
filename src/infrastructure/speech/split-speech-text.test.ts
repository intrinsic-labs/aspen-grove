import { splitSpeechText } from './split-speech-text';

describe('splitSpeechText', () => {
  it('keeps text within the limit whole', () => {
    expect(splitSpeechText('Hello there.', 100)).toEqual(['Hello there.']);
  });

  it('keeps everything when the limit is unbounded', () => {
    const text = 'a'.repeat(10_000);
    expect(splitSpeechText(text, Number.MAX_VALUE)).toEqual([text]);
  });

  it('breaks at sentence ends and never exceeds the limit', () => {
    const text = 'The model hums along quietly. '.repeat(300);
    const pieces = splitSpeechText(text, 4000);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(4000);
      expect(piece.endsWith('.')).toBe(true);
    }
    expect(pieces.join(' ')).toBe(text.trim());
  });

  it('falls back to whitespace, then a hard cut', () => {
    expect(splitSpeechText('aaaa bbbb cccc', 9)).toEqual(['aaaa', 'bbbb cccc']);
    expect(splitSpeechText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });
});
