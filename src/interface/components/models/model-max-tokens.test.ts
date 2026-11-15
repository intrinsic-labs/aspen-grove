import { describe, expect, it } from '@jest/globals';
import { heldMaxTokens, maxTokensAllowed } from './model-max-tokens';

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

describe('heldMaxTokens', () => {
  it('holds a saved value to the limit', () => {
    expect(heldMaxTokens(32768, false, 2048)).toBe(2048);
    expect(heldMaxTokens(1000, false, 2048)).toBe(1000);
    expect(heldMaxTokens(0, false, 2048)).toBe(1);
  });

  it('takes the limit with Always use maximum allowed on', () => {
    expect(heldMaxTokens(1000, true, 2048)).toBe(2048);
    expect(heldMaxTokens(32768, true, 2048)).toBe(2048);
  });
});
