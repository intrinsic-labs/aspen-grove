import { describe, expect, it } from '@jest/globals';
import { formatTemperature, toTreeModelValues } from './tree-model-values';

describe('toTreeModelValues', () => {
  it('fills defaults and keeps values in range', () => {
    // No Maximum Output Tokens set: none is sent, so none is shown.
    expect(toTreeModelValues({}, 8192)).toEqual({
      temperature: 1,
      maxTokens: null,
      useMaxTokens: false,
    });
    expect(
      toTreeModelValues({ temperature: 1.4, maxTokens: 50000 }, 8192)
    ).toEqual({ temperature: 1, maxTokens: 8192, useMaxTokens: false });
  });

  it('follows the model limit while "Always use maximum allowed" is on', () => {
    expect(
      toTreeModelValues({ maxTokens: 100, useMaxTokens: true }, 16384).maxTokens
    ).toBe(16384);
    expect(toTreeModelValues({ useMaxTokens: true }, 16384).maxTokens).toBe(
      16384
    );
  });
});

describe('formatTemperature', () => {
  it('formats as SwiftUI does in en-US', () => {
    expect(formatTemperature(0)).toBe('0');
    expect(formatTemperature(0.7000000001)).toBe('0.7');
    expect(formatTemperature(1)).toBe('1');
  });
});
