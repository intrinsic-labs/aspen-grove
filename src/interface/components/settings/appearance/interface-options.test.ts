import { cornerRadiusOptions, fontSizeOptions } from './interface-options';

describe('interface options', () => {
  it('offers font sizes 12 to 26', () => {
    const sizes = fontSizeOptions(17).map((option) => option.value);
    expect(sizes[0]).toBe(12);
    expect(sizes[sizes.length - 1]).toBe(26);
    expect(sizes).toHaveLength(15);
  });

  it('keeps a stored size outside the range selectable', () => {
    expect(fontSizeOptions(30).map((option) => option.value)).toContain(30);
  });

  it('labels the corner radii as Latent Spaces does', () => {
    const labels = cornerRadiusOptions(8).map((option) => option.label);
    expect(labels[0]).toBe('0 (hacker)');
    expect(labels).toContain('8 (default)');
    expect(labels[labels.length - 1]).toBe('20 (material design plebeian)');
    expect(labels).toHaveLength(11);
  });

  it('keeps an odd stored radius in order', () => {
    const values = cornerRadiusOptions(9).map((option) => option.value);
    expect(values.slice(4, 7)).toEqual([8, 9, 10]);
  });
});
