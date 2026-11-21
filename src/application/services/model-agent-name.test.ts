import { describe, expect, it } from '@jest/globals';
import { parseModelRef } from '@domain/value-objects';
import { modelAgentName, readableModelName } from './model-agent-name';

describe('readableModelName', () => {
  it('keeps the last path segment', () => {
    expect(readableModelName('qwen/qwen3-8b')).toBe('qwen3-8b');
    expect(readableModelName(' gemma-3-12b ')).toBe('gemma-3-12b');
  });
});

describe('modelAgentName', () => {
  const ref = parseModelRef('openrouter:anthropic/claude-haiku-4.5');

  it("uses the model's display name when known", () => {
    expect(modelAgentName(ref, 'Anthropic: Claude Haiku 4.5')).toBe(
      'Anthropic: Claude Haiku 4.5'
    );
  });

  it('falls back to a readable identifier', () => {
    expect(modelAgentName(ref)).toBe('claude-haiku-4.5');
    expect(modelAgentName(ref, '  ')).toBe('claude-haiku-4.5');
  });
});
