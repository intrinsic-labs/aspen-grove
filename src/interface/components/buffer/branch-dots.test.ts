import { describe, expect, it } from '@jest/globals';
import { branchDots } from './branch-dots';

describe('branchDots', () => {
  it('draws one dot per sibling up to the cap', () => {
    expect(branchDots(3, 0, 7)).toEqual({ visible: 3, activeSlot: 0 });
    expect(branchDots(3, 2, 7)).toEqual({ visible: 3, activeSlot: 2 });
    expect(branchDots(7, 6, 7)).toEqual({ visible: 7, activeSlot: 6 });
  });

  it('draws a single dot for one sibling and none for zero', () => {
    expect(branchDots(1, 0, 7)).toEqual({ visible: 1, activeSlot: 0 });
    expect(branchDots(0, 0, 7)).toEqual({ visible: 0, activeSlot: 0 });
  });

  it('caps the row and keeps the current dot inside it', () => {
    expect(branchDots(20, 0, 7)).toEqual({ visible: 7, activeSlot: 0 });
    expect(branchDots(20, 10, 7)).toEqual({ visible: 7, activeSlot: 3 });
    expect(branchDots(20, 19, 7)).toEqual({ visible: 7, activeSlot: 6 });
    expect(branchDots(20, 2, 7)).toEqual({ visible: 7, activeSlot: 2 });
  });

  it('clamps an out-of-range index', () => {
    expect(branchDots(3, 9, 7)).toEqual({ visible: 3, activeSlot: 2 });
    expect(branchDots(3, -1, 7)).toEqual({ visible: 3, activeSlot: 0 });
  });
});
