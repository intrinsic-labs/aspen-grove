import { describe, expect, it } from '@jest/globals';
import { LlmProviderError } from './ILlmProvider';
import {
  plainProviderErrorLine,
  providerErrorDetail,
  providerLabel,
} from './provider-error-copy';

const error = (
  code: LlmProviderError['code'],
  provider: LlmProviderError['provider'] = 'lmstudio'
) => new LlmProviderError({ code, message: 'raw', provider, retryable: false });

describe('providerLabel', () => {
  it('names providers the way people know them', () => {
    expect(providerLabel('lmstudio')).toBe('LM Studio');
    expect(providerLabel('openrouter')).toBe('OpenRouter');
  });
});

describe('plainProviderErrorLine', () => {
  it.each<[LlmProviderError['code'], string]>([
    ['unknown', 'LM Studio returned an error.'],
    ['serverError', 'LM Studio had a server error. Try again.'],
    ['modelNotFound', "LM Studio couldn't find that model."],
    ['invalidRequest', "LM Studio couldn't accept the request."],
    ['timeout', 'LM Studio took too long to answer.'],
    ['contentFiltered', 'LM Studio withheld the response.'],
    [
      'contextTooLong',
      "The conversation is longer than this model's context window.",
    ],
    ['cancelled', 'Stopped.'],
  ])('%s reads "%s"', (code, line) => {
    expect(plainProviderErrorLine(error(code))).toBe(line);
  });

  it('names the provider the request went to', () => {
    expect(plainProviderErrorLine(error('networkError', 'openrouter'))).toBe(
      "Couldn't reach OpenRouter. Check your connection, then try again."
    );
  });
});

describe('providerErrorDetail', () => {
  it('formats a provider error as [provider:code] message', () => {
    expect(providerErrorDetail(error('unknown'))).toBe(
      '[lmstudio:unknown] raw'
    );
  });

  it('uses the message of any other error, or the value itself', () => {
    expect(providerErrorDetail(new TypeError('Network request failed'))).toBe(
      'Network request failed'
    );
    expect(providerErrorDetail('odd')).toBe('odd');
  });

  it('has nothing to say about no error', () => {
    expect(providerErrorDetail(undefined)).toBeUndefined();
    expect(providerErrorDetail(null)).toBeUndefined();
  });
});
