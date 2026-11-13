import { describe, expect, it } from '@jest/globals';
import {
  formatTemperature,
  formatTokenCount,
  maxTokensAllowed,
  toTreeModelValues,
} from './tree-model-values';

describe('maxTokensAllowed', () => {
  it("uses the model's own limit, as Latent Spaces does", () => {
    expect(
      maxTokensAllowed({ id: 'a', label: 'A', maxOutputTokens: 16384 })
    ).toBe(16384);
  });

  it('falls back to 8192 for a listed model without one, 4096 for an unknown one', () => {
    expect(maxTokensAllowed({ id: 'a', label: 'A' })).toBe(8192);
    expect(maxTokensAllowed(undefined)).toBe(4096);
  });
});

describe('toTreeModelValues', () => {
  it('fills defaults and keeps values in range', () => {
    expect(toTreeModelValues({}, 8192)).toEqual({
      temperature: 1,
      maxTokens: 4096,
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
  });
});

describe('formatting', () => {
  it('formats as SwiftUI does in en-US', () => {
    expect(formatTemperature(0)).toBe('0');
    expect(formatTemperature(0.7000000001)).toBe('0.7');
    expect(formatTemperature(1)).toBe('1');
    expect(formatTokenCount(4096)).toBe('4,096');
    expect(formatTokenCount(921600)).toBe('921,600');
    expect(formatTokenCount(512)).toBe('512');
  });
});
