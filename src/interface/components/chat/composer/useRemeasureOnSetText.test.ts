import { isSetText, remeasureNudge } from './useRemeasureOnSetText';

describe('remeasureNudge', () => {
  it('alternates between no offset and a sub-pixel one', () => {
    expect(remeasureNudge(0)).toBe(0);
    const first = remeasureNudge(1);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1 / 3);
    expect(remeasureNudge(2)).toBe(0);
    expect(remeasureNudge(3)).toBe(first);
  });
});

describe('isSetText', () => {
  it('ignores a value the user just typed', () => {
    expect(isSetText('hello', 'hello')).toBe(false);
  });

  it('flags a value set from code', () => {
    expect(isSetText('In one short plain sentence', '')).toBe(true);
    expect(isSetText('', 'a draft')).toBe(true);
  });
});
