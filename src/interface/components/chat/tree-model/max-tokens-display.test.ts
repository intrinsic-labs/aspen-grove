import { describe, expect, it } from '@jest/globals';
import {
  maxTokensLabel,
  maxTokensSliderValue,
  PROVIDER_DEFAULT_LABEL,
} from './max-tokens-display';

describe('maxTokensLabel', () => {
  it('names the provider default when the agent sets none', () => {
    expect(maxTokensLabel(null)).toBe(PROVIDER_DEFAULT_LABEL);
  });

  it('shows a set value in full', () => {
    expect(maxTokensLabel(4096)).toBe('4,096');
  });
});

describe('maxTokensSliderValue', () => {
  it("rests at the model's maximum when none is set", () => {
    expect(maxTokensSliderValue(null, 8192)).toBe(8192);
  });

  it('sits at a set value', () => {
    expect(maxTokensSliderValue(2048, 8192)).toBe(2048);
  });
});
