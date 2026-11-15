import { describe, expect, it } from '@jest/globals';
import { materialBlurMethod } from './material-blur-method';

describe('materialBlurMethod', () => {
  it('blurs on Android when there is a target to sample', () => {
    expect(materialBlurMethod('android', true)).toBe(
      'dimezisBlurViewSdk31Plus'
    );
  });

  it('falls back to the flat material on Android without a target', () => {
    expect(materialBlurMethod('android', false)).toBe('none');
  });

  it('leaves iOS to its system material', () => {
    expect(materialBlurMethod('ios', true)).toBe('none');
    expect(materialBlurMethod('ios', false)).toBe('none');
  });
});
