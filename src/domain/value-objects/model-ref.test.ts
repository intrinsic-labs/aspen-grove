import { describe, expect, it } from '@jest/globals';
import { parseModelRef } from './model-ref';

describe('parseModelRef', () => {
  it('reads the routable providers', () => {
    expect(parseModelRef('openrouter:anthropic/claude-sonnet-4')).toBe(
      'openrouter:anthropic/claude-sonnet-4'
    );
    expect(parseModelRef(' lmstudio:qwen3-8b ')).toBe('lmstudio:qwen3-8b');
  });

  // Stored agents are read back through parseModelRef, so these must keep
  // parsing (see entities/provider.ts).
  it("reads an Open Loom import's placeholder agent", () => {
    expect(parseModelRef('custom:imported')).toBe('custom:imported');
  });

  it.each(['hyperbolic', 'anthropic', 'openai', 'google', 'local'])(
    'reads a legacy %s agent without an adapter',
    (provider) => {
      expect(parseModelRef(`${provider}:some-model`)).toBe(
        `${provider}:some-model`
      );
    }
  );

  it('rejects an unknown provider or a malformed ref', () => {
    expect(() => parseModelRef('mystery:model')).toThrow(
      'Unknown provider: mystery'
    );
    expect(() => parseModelRef('openrouter')).toThrow();
    expect(() => parseModelRef('openrouter:')).toThrow();
    expect(() => parseModelRef('   ')).toThrow();
  });
});
