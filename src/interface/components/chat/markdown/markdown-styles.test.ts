import { fonts } from '@interface/ui/value-objects/fonts';
import { createMarkdownStyles } from './markdown-styles';
import { emphasisSlant } from './markdown-inline-styles';

const colors = {
  textColor: 'white',
  secondary: 'grey',
  codeBackground: 'black',
  green: 'green',
};

const base = { fontFamily: 'Face', fontSize: 20, lineHeight: 30 };

describe('createMarkdownStyles', () => {
  it('sizes the body from the base style', () => {
    expect(createMarkdownStyles(base, colors).body).toEqual({
      fontFamily: 'Face',
      fontSize: 20,
      lineHeight: 30,
      color: 'white',
    });
  });

  it('scales headings 1 to 6 from the body, in the bold face', () => {
    const styles = createMarkdownStyles(base, colors);
    const sizes = [1, 2, 3, 4, 5, 6].map((level) => {
      const heading = styles[`heading${level as 1 | 2 | 3 | 4 | 5 | 6}`];
      return [heading.fontSize, heading.lineHeight, heading.marginTop];
    });
    expect(sizes).toEqual([
      [32, 42, 16],
      [28, 39, 14],
      [24, 36, 12],
      [22, 33, 10],
      [20, 30, 8],
      [18, 27, 8],
    ]);
    expect(styles.heading1.fontFamily).toBe('Cardo-Bold');
    expect(styles.heading6.color).toBe('white');
  });

  it("takes the base style's color over the theme's", () => {
    const styles = createMarkdownStyles({ ...base, color: 'red' }, colors);
    expect(styles.body.color).toBe('red');
    expect(styles.code_inline.color).toBe('red');
    expect(styles.bullet_list_icon.color).toBe('red');
  });

  it('falls back to Cardo at the default message size', () => {
    const styles = createMarkdownStyles(undefined, colors);
    expect(styles.body.fontFamily).toBe('Cardo-Regular');
    expect(styles.body.fontSize).toBeGreaterThan(0);
    expect(styles.body.color).toBe('white');
  });

  it.each([
    [fonts.cardoRegular, 'Cardo-Bold', 'Cardo-Italic'],
    [fonts.mono, fonts.monoBold, fonts.monoItalic],
    [fonts.openSans, fonts.openSansBold, fonts.openSansItalic],
    [fonts.vt220, fonts.vt220, fonts.vt220],
  ])(
    'uses %s faces without synthetic weight or slant',
    (family, bold, italic) => {
      const styles = createMarkdownStyles(
        { ...base, fontFamily: family },
        colors
      );
      expect(styles.body.fontFamily).toBe(family);
      expect(styles.strong).toMatchObject({
        fontFamily: bold,
        fontWeight: 'normal',
      });
      expect(styles.em.fontFamily).toBe(italic);
      for (const level of [1, 2, 3, 4, 5, 6] as const) {
        expect(styles[`heading${level}`]).toMatchObject({
          fontFamily: bold,
          fontWeight: 'normal',
        });
      }
      expect(styles.th).toMatchObject({
        fontFamily: bold,
        fontWeight: 'normal',
      });
      expect(styles.td.fontFamily).toBe(family);
      expect(styles.code_inline.fontFamily).toBe(fonts.mono);
      expect(styles.code_block.fontFamily).toBe(fonts.mono);
      expect(styles.fence.fontFamily).toBe(fonts.mono);
    }
  );

  it('keeps list icons as separate objects', () => {
    const styles = createMarkdownStyles(base, colors);
    expect(styles.bullet_list_icon).toEqual(styles.ordered_list_icon);
    expect(styles.bullet_list_icon).not.toBe(styles.ordered_list_icon);
  });
});

describe('emphasisSlant', () => {
  const cardo = { regular: 'Cardo-Regular', italic: 'Cardo-Italic' };
  const vt220 = { regular: fonts.vt220, italic: fonts.vt220 };
  it('asks iOS for italic so RCTFont keeps the italic face', () => {
    expect(emphasisSlant('ios', cardo)).toBe('italic');
  });
  it('keeps Android normal, so it does not look for an italic of the italic face', () => {
    expect(emphasisSlant('android', cardo)).toBe('normal');
  });
  it('leaves a face with no italic upright on iOS', () => {
    expect(emphasisSlant('ios', vt220)).toBe('normal');
  });
});

it.each(['System', undefined])(
  'renders resolved System (%s) with native emphasis',
  (fontFamily) => {
    const styles = createMarkdownStyles({ ...base, fontFamily }, colors);
    expect(styles.body.fontFamily).toBeUndefined();
    expect(styles.strong).toMatchObject({
      fontFamily: undefined,
      fontWeight: 'bold',
    });
    expect(styles.em).toMatchObject({
      fontFamily: undefined,
      fontStyle: 'italic',
    });
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      expect(styles[`heading${level}`]).toMatchObject({
        fontFamily: undefined,
        fontWeight: 'bold',
      });
    }
    expect(styles.th).toMatchObject({
      fontFamily: undefined,
      fontWeight: 'bold',
    });
    expect(styles.td.fontFamily).toBeUndefined();
  }
);

it.each(['ios', 'android'])('synthesizes System italics on %s', (os) => {
  expect(emphasisSlant(os, { regular: undefined, italic: undefined })).toBe(
    'italic'
  );
});
