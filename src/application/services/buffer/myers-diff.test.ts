import { describe, expect, it } from '@jest/globals';
import { matchTokens } from './myers-diff';

/** The 2a table diff, kept here as the reference for ties and for length. */
const referenceMatches = (a: string[], b: string[]): number[] => {
  let head = 0;
  const matches = b.map(() => -1);
  while (head < a.length && head < b.length && a[head] === b[head]) {
    matches[head] = head;
    head += 1;
  }
  const x = a.slice(head);
  const y = b.slice(head);
  const cols = y.length + 1;
  const lcs = new Uint32Array((x.length + 1) * cols);
  for (let i = x.length - 1; i >= 0; i -= 1) {
    for (let j = y.length - 1; j >= 0; j -= 1) {
      lcs[i * cols + j] =
        x[i] === y[j]
          ? lcs[(i + 1) * cols + j + 1] + 1
          : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      matches[head + j] = head + i;
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return matches;
};

describe('matchTokens', () => {
  it('matches the reference on random sequences, ties included', () => {
    let seed = 11;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let round = 0; round < 600; round += 1) {
      const a = Array.from({ length: random(14) }, () => 'abc'[random(3)]);
      const b = Array.from({ length: random(14) }, () => 'abc'[random(3)]);
      expect(Array.from(matchTokens(a, b))).toEqual(referenceMatches(a, b));
    }
  });

  it('matches the earliest place in the current text on a tie', () => {
    expect(Array.from(matchTokens(['b'], ['x', 'b', 'b']))).toEqual([
      -1, 0, -1,
    ]);
  });

  it('stays exact on a long sequence with one edit, in linear space', () => {
    const a = Array.from({ length: 20_000 }, (_, i) => `t${i}`);
    const b = [...a];
    b[10_000] = 'changed';
    const matches = matchTokens(a, b);
    expect(matches[10_000]).toBe(-1);
    expect(matches.filter((m) => m < 0)).toHaveLength(1);
  });

  it('falls back to the common ends past the edit bound', () => {
    const a = ['s', ...Array.from({ length: 50 }, (_, i) => `a${i}`), 'e'];
    const b = ['s', ...Array.from({ length: 50 }, (_, i) => `b${i}`), 'e'];
    const matches = matchTokens(a, b, 10);
    expect(matches[0]).toBe(0);
    expect(matches[51]).toBe(51);
    expect(matches.slice(1, 51).every((m) => m < 0)).toBe(true);
  });

  it('never matches one ancestor token twice when the bound is exceeded', () => {
    // The common prefix takes ancestor 0; the fallback must stay in the middle.
    const ancestor = ['x', 'x', 'x'];
    const current = ['x', 'z', 'x', 'x', 'x'];
    const matches = Array.from(matchTokens(ancestor, current, 1));
    const used = matches.filter((at) => at >= 0);
    expect(new Set(used).size).toBe(used.length);
    expect(matches).toEqual([0, -1, -1, 1, 2]);
  });
});
