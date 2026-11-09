import { describe, expect, it } from '@jest/globals';
import { isNearBottom } from './scroll-position';

const metrics = (offsetY: number) => ({
  layoutMeasurement: { height: 600 },
  contentOffset: { y: offsetY },
  contentSize: { height: 2000 },
});

describe('isNearBottom', () => {
  it('is true at the very end', () => {
    expect(isNearBottom(metrics(1400))).toBe(true);
  });

  it('is true within the threshold', () => {
    expect(isNearBottom(metrics(1352))).toBe(true);
  });

  it('is false just past the threshold', () => {
    expect(isNearBottom(metrics(1351))).toBe(false);
  });

  it('is true when content is shorter than the viewport', () => {
    expect(
      isNearBottom({
        layoutMeasurement: { height: 600 },
        contentOffset: { y: 0 },
        contentSize: { height: 300 },
      })
    ).toBe(true);
  });
});
