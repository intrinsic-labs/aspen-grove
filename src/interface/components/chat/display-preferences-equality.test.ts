import { sameDisplayPreferences } from './display-preferences-equality';
import type { ChatDisplayPreferences } from './types';

const base: ChatDisplayPreferences = {
  userNodeViewStyle: 'filled',
  userNodeCornerRadius: 8,
  messageFontSize: 17,
  messageLineHeight: 27,
  messageFontFamily: undefined,
};

describe('sameDisplayPreferences', () => {
  it('treats equal values in different objects as the same', () => {
    expect(sameDisplayPreferences(base, { ...base })).toBe(true);
  });

  it.each([
    ['userNodeViewStyle', 'outlined'],
    ['userNodeCornerRadius', 12],
    ['messageFontSize', 18],
    ['messageLineHeight', 28],
    ['messageFontFamily', 'Cardo-Regular'],
  ] as const)('notices a change to %s', (field, value) => {
    expect(sameDisplayPreferences(base, { ...base, [field]: value })).toBe(
      false
    );
  });
});
