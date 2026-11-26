import {
  connectionProvider,
  connectionProviderTitle,
} from './connection-provider';

describe('connectionProvider', () => {
  it('reads each provider Connections has a screen for', () => {
    expect(connectionProvider('openrouter')).toBe('openrouter');
    expect(connectionProvider('anthropic')).toBe('anthropic');
    expect(connectionProvider('openai')).toBe('openai');
    expect(connectionProvider('lmstudio')).toBe('lmstudio');
  });

  it('has none for an unknown or missing param', () => {
    expect(connectionProvider('gemini')).toBeNull();
    expect(connectionProvider(undefined)).toBeNull();
  });

  it('titles the screen with the provider’s name', () => {
    expect(connectionProviderTitle('lmstudio')).toBe('LM Studio');
    expect(connectionProviderTitle('anthropic')).toBe('Anthropic');
    expect(connectionProviderTitle('nope')).toBe('');
  });
});
