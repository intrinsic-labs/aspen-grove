import type { ULID } from '@domain/value-objects';
import type { ChatRow } from '../types';
import {
  initialRowStart,
  nextRowStart,
  type ProgressiveRowsBudget,
} from './progressive-rows';

const rowsOfLengths = (lengths: readonly number[]): ChatRow[] =>
  lengths.map((length, index) => ({
    id: `row-${index}` as ULID,
    localId: `L${index}`,
    authorType: index % 2 === 0 ? 'human' : 'model',
    text: 'x'.repeat(length),
    bookmarked: false,
    pruned: false,
    continuationCount: 1,
  }));

const budget: ProgressiveRowsBudget = {
  initialChars: 1000,
  sliceChars: 2000,
  minRows: 2,
};

describe('progressive rows', () => {
  it('starts with the tail that fills the first budget', () => {
    const rows = rowsOfLengths([500, 500, 500, 500, 500, 500]);
    expect(initialRowStart(rows, budget)).toBe(4);
  });

  it('always shows at least the minimum rows', () => {
    const rows = rowsOfLengths([5000, 5000, 5000]);
    expect(initialRowStart(rows, budget)).toBe(1);
  });

  it('counts short rows as a minimum size, so many short rows still split', () => {
    const rows = rowsOfLengths(Array.from({ length: 20 }, () => 10));
    // 1000 chars at 200 per row.
    expect(initialRowStart(rows, budget)).toBe(15);
  });

  it('renders a short path whole', () => {
    expect(initialRowStart(rowsOfLengths([100, 100]), budget)).toBe(0);
    expect(initialRowStart([], budget)).toBe(0);
  });

  it('adds slices above until it reaches the first row', () => {
    const rows = rowsOfLengths(Array.from({ length: 10 }, () => 500));
    const first = initialRowStart(rows, budget);
    const second = nextRowStart(rows, first, budget);
    const third = nextRowStart(rows, second, budget);

    expect(first).toBe(8);
    expect(second).toBe(4);
    expect(third).toBe(0);
    expect(nextRowStart(rows, 0, budget)).toBe(0);
  });

  it('clamps a start past the end of a shorter path', () => {
    const rows = rowsOfLengths([1000, 1000, 1000, 1000, 1000]);
    expect(nextRowStart(rows, 10, budget)).toBe(3);
  });
});
