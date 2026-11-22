import { fonts } from '@interface/ui/value-objects/fonts';
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
    const type = toMessageType(16, fonts.mono);
    expect(type.fontSize).toBe(16);
    expect(type.lineHeight).toBeCloseTo(21.63, 2);
  });
});

it('renders VT220 two points larger with loose leading, without accumulating the offset', () => {
  for (const size of [12, 17, 26, 30]) {
    const type = toMessageType(size, fonts.vt220);
    expect(type.fontSize).toBe(size + 2);
    expect(type.lineHeight).toBe((size + 2) * 1.5);
    expect(type.lineHeight / type.fontSize).toBeGreaterThan(
      toMessageType(size, fonts.mono).lineHeight / size
    );
    expect(toMessageType(size, fonts.vt220)).toEqual(type);
  }
});
