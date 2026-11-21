import {
  emphasisFaces,
  fonts,
  messageFontFamilies,
  messageFontFamily,
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

  it('maps saved Open Sans to System in both preference read paths', () => {
    expect(normalizeMessageFontFamily(' OpenSans-Regular ')).toBe(fonts.system);
    expect(toChatFontFace('OpenSans-Regular')).toBe(fonts.system);
  });

  it('resolves System without a family and keeps Cardo as the default', () => {
    expect(messageFontFamily(fonts.system)).toBeUndefined();
    expect(messageFontFamily('OpenSans-Regular')).toBeUndefined();
    expect(messageFontFamily()).toBe(fonts.cardoRegular);
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

describe('message emphasis faces', () => {
  const cardo = {
    regular: 'Cardo-Regular',
    bold: 'Cardo-Bold',
    italic: 'Cardo-Italic',
    boldItalic: 'Cardo-Bold',
  };

  it.each([undefined, fonts.cardoRegular, 'unknown-font'])(
    'uses Cardo faces for %s',
    (family) => expect(emphasisFaces(family)).toEqual(cardo)
  );

  it('uses all four JetBrains Mono faces', () => {
    expect(emphasisFaces(fonts.mono)).toEqual({
      regular: 'JetBrainsMono-Regular',
      bold: 'JetBrainsMono-Bold',
      italic: 'JetBrainsMono-Italic',
      boldItalic: 'JetBrainsMono-BoldItalic',
    });
  });

  it('uses all four Open Sans faces', () => {
    expect(emphasisFaces(fonts.openSans)).toEqual({
      regular: 'OpenSans-Regular',
      bold: 'OpenSans-Bold',
      italic: 'OpenSans-Italic',
      boldItalic: 'OpenSans-BoldItalic',
    });
  });

  it('keeps VT220 unchanged for every emphasis', () => {
    expect(emphasisFaces(fonts.vt220)).toEqual({
      regular: fonts.vt220,
      bold: fonts.vt220,
      italic: fonts.vt220,
      boldItalic: fonts.vt220,
    });
  });
});

it('lets the native System font synthesize emphasis', () => {
  expect(emphasisFaces(fonts.system)).toEqual({
    regular: undefined,
    bold: undefined,
    italic: undefined,
    boldItalic: undefined,
  });
});
