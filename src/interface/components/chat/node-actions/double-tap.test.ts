import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { isDoubleTap } from './double-tap';

const a = 'A' as ULID;
const b = 'B' as ULID;

describe('isDoubleTap', () => {
  it('is false for a first tap', () => {
    expect(isDoubleTap(null, a, 1000)).toBe(false);
  });

  it('is true for a second tap on the same node inside the window', () => {
    expect(isDoubleTap({ nodeId: a, atMs: 1000 }, a, 1299)).toBe(true);
  });

  it('is false at or past the window', () => {
    expect(isDoubleTap({ nodeId: a, atMs: 1000 }, a, 1300)).toBe(false);
  });

  it('is false for a tap on a different node', () => {
    expect(isDoubleTap({ nodeId: a, atMs: 1000 }, b, 1100)).toBe(false);
  });
});
