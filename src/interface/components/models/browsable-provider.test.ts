import { describe, expect, it } from '@jest/globals';
import { browsableProvider } from './browsable-provider';

describe('browsableProvider', () => {
  it('reads the providers that have a browser', () => {
    expect(browsableProvider('anthropic')).toBe('anthropic');
    expect(browsableProvider('openai')).toBe('openai');
    expect(browsableProvider('openrouter')).toBe('openrouter');
  });

  it('falls back to OpenRouter for LM Studio, an unknown name or none', () => {
    expect(browsableProvider('lmstudio')).toBe('openrouter');
    expect(browsableProvider('google')).toBe('openrouter');
    expect(browsableProvider(undefined)).toBe('openrouter');
  });
});
