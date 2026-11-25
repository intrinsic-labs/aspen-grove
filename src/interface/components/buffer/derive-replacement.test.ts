import { describe, expect, it } from '@jest/globals';
import { deriveReplacement } from './derive-replacement';

describe('deriveReplacement', () => {
  it('reads a typed character at the caret', () => {
    expect(deriveReplacement('ab', 'aXb', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 1,
      inserted: 'X',
    });
  });

  it('puts a repeated character at the actual caret', () => {
    expect(deriveReplacement('aaa', 'aaaa', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 1,
      inserted: 'a',
    });
    expect(deriveReplacement('aaa', 'aaaa', { start: 3, end: 3 })).toEqual({
      start: 3,
      end: 3,
      inserted: 'a',
    });
  });

  it('reads backspace and forward delete at the caret', () => {
    expect(deriveReplacement('aaa', 'aa', { start: 2, end: 2 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
    expect(deriveReplacement('abc', 'ac', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
    expect(deriveReplacement('abc', 'ac', { start: 2, end: 2 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
  });

  it('reads a paste over a selection', () => {
    expect(
      deriveReplacement('hello world', 'hello there', { start: 6, end: 11 })
    ).toEqual({
      start: 6,
      end: 11,
      inserted: 'there',
    });
  });

  it('recovers an autocorrect that replaces more than the selection', () => {
    expect(deriveReplacement('I teh', 'I the', { start: 5, end: 5 })).toEqual({
      start: 3,
      end: 5,
      inserted: 'he',
    });
  });

  it('falls back to common ends with no selection', () => {
    expect(deriveReplacement('abcd', 'abXd', null)).toEqual({
      start: 2,
      end: 3,
      inserted: 'X',
    });
  });

  it('reports no change for equal strings', () => {
    expect(deriveReplacement('same', 'same', { start: 1, end: 1 })).toBeNull();
  });
});
