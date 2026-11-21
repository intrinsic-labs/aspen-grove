import { createMarkdownStyles } from './markdown-styles';

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

  it('sets bold and italic by face, without a synthetic weight or slant', () => {
    // Merged over the library's fontWeight 'bold' / fontStyle 'italic',
    // which on Android would swap Cardo for the system sans.
    const { strong, em } = createMarkdownStyles(base, colors);
    expect(strong).toMatchObject({
      fontFamily: 'Cardo-Bold',
      fontWeight: 'normal',
    });
    expect(em).toMatchObject({
      fontFamily: 'Cardo-Italic',
      fontStyle: 'normal',
    });
  });

  it('keeps list icons as separate objects', () => {
    const styles = createMarkdownStyles(base, colors);
    expect(styles.bullet_list_icon).toEqual(styles.ordered_list_icon);
    expect(styles.bullet_list_icon).not.toBe(styles.ordered_list_icon);
  });
});
