import { toMessageType } from './message-type';

describe('toMessageType', () => {
  it('sets the default Cardo over the chosen size, lines about 24.3 apart', () => {
    for (const family of [undefined, 'Cardo-Regular']) {
      const type = toMessageType(17, family);
      expect(type.fontSize).toBe(18);
      expect(type.lineHeight).toBeCloseTo(24.34, 2);
    }
  });

  it('keeps other faces at the chosen size', () => {
    const type = toMessageType(16, 'IBMPlexMono-Regular');
    expect(type.fontSize).toBe(16);
    expect(type.lineHeight).toBeCloseTo(21.63, 2);
  });
});
