import { describe, expect, it } from '@jest/globals';
import { directProviderEndpoint } from './direct-provider-endpoints';

const env = {
  EXPO_PUBLIC_ANTHROPIC_ENDPOINT: ' http://localhost:1236/v1/messages ',
  EXPO_PUBLIC_OPENAI_ENDPOINT: '',
};

describe('directProviderEndpoint', () => {
  it("reads each provider's override, trimmed", () => {
    expect(directProviderEndpoint('anthropic', env, true)).toBe(
      'http://localhost:1236/v1/messages'
    );
  });

  it('leaves a provider without an override on its real endpoint', () => {
    expect(directProviderEndpoint('openai', env, true)).toBeUndefined();
    expect(directProviderEndpoint('openai', {}, true)).toBeUndefined();
  });

  it('ignores the override outside development builds', () => {
    expect(directProviderEndpoint('anthropic', env, false)).toBeUndefined();
  });
});
