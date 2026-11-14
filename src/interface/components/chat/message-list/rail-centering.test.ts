import { describe, expect, it } from '@jest/globals';
import { visibleContentBottom } from './list-insets';
import { centeredRailOffset } from './rail-centering';

const screen = {
  headerHeight: 100,
  viewportHeight: 900,
  composerHeight: 100,
  contentHeight: 5000,
};
// The readable area runs from 100 to this, in viewport coordinates.
const readableBottom = visibleContentBottom(0, 900, 100);
const readableCenter = (100 + readableBottom) / 2;

describe('centeredRailOffset', () => {
  it('puts the rail’s middle in the middle of the readable area', () => {
    const offset = centeredRailOffset({
      ...screen,
      railTop: 2000,
      railHeight: 300,
    });
    expect(2000 + 150 - offset).toBeCloseTo(readableCenter);
  });

  it('aligns a rail taller than the readable area by its top', () => {
    const offset = centeredRailOffset({
      ...screen,
      railTop: 2000,
      railHeight: 2000,
    });
    expect(offset).toBe(2000 - 100);
  });

  it('stays within the scrollable range', () => {
    expect(
      centeredRailOffset({ ...screen, railTop: 50, railHeight: 100 })
    ).toBe(0);
    expect(
      centeredRailOffset({ ...screen, railTop: 4900, railHeight: 100 })
    ).toBe(5000 - 900);
  });
});
