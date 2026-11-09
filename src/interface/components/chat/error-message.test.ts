import { describe, expect, it } from '@jest/globals';
import { LlmProviderError } from '@application/services/llm';
import { toErrorMessage, toGenerationErrorMessage } from './error-message';

describe('toErrorMessage', () => {
  it('uses an Error message', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies anything else', () => {
    expect(toErrorMessage('plain')).toBe('plain');
    expect(toErrorMessage(42)).toBe('42');
  });
});

describe('toGenerationErrorMessage', () => {
  it('prefixes provider errors with provider and code', () => {
    const error = new LlmProviderError({
      code: 'rateLimited',
      message: 'slow down',
      provider: 'openrouter',
      retryable: true,
    });
    expect(toGenerationErrorMessage(error)).toBe(
      '[openrouter:rateLimited] slow down'
    );
  });

  it('falls back to the plain message for other errors', () => {
    expect(toGenerationErrorMessage(new Error('boom'))).toBe('boom');
    expect(toGenerationErrorMessage(undefined)).toBe('undefined');
  });
});
