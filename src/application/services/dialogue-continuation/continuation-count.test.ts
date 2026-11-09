import { describe, expect, it } from '@jest/globals';
import {
  clampContinuationCount,
  DEFAULT_PARALLEL_CONTINUATIONS,
  isValidContinuationCount,
} from './continuation-count';

describe('continuation count', () => {
  it('accepts whole numbers from 1 to 4 only', () => {
    expect([0, 1, 2.5, 4, 5].map(isValidContinuationCount)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it('clamps stored or requested values into range', () => {
    expect(clampContinuationCount(0)).toBe(1);
    expect(clampContinuationCount(9)).toBe(4);
    expect(clampContinuationCount(2.6)).toBe(3);
    expect(clampContinuationCount('3')).toBe(DEFAULT_PARALLEL_CONTINUATIONS);
    expect(clampContinuationCount(Number.NaN)).toBe(
      DEFAULT_PARALLEL_CONTINUATIONS
    );
  });
});
