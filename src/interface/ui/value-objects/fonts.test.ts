import {
  fonts,
  messageFontFamilies,
  normalizeMessageFontFamily,
  toChatFontFace,
} from './fonts';

describe('stored message font preferences', () => {
  it('maps the retired mono selection in both preference read paths', () => {
    const stored = 'IBM\u0050lexMono-Regular';
    expect(normalizeMessageFontFamily(stored)).toBe(fonts.mono);
    expect(toChatFontFace(stored)).toBe(fonts.mono);
    expect(normalizeMessageFontFamily(` ${stored} `)).toBe(fonts.mono);
  });

  it.each(messageFontFamilies)('preserves the supported face %s', (face) => {
    expect(normalizeMessageFontFamily(face)).toBe(face);
    expect(toChatFontFace(face)).toBe(face);
  });

  it.each([undefined, '', 'missing-font'])(
    'uses the default for %s',
    (face) => {
      expect(normalizeMessageFontFamily(face)).toBeUndefined();
      expect(toChatFontFace(face)).toBe(fonts.cardoRegular);
    }
  );
});
