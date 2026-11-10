import { describe, expect, it } from '@jest/globals';
import { describeProviderError } from './describe-provider-error';
import { LlmProviderError } from './ILlmProvider';
import { MissingProviderKeyError } from './missing-provider-key-error';

const lmstudioError = (code: LlmProviderError['code'], message = 'boom') =>
  new LlmProviderError({
    code,
    message,
    provider: 'lmstudio',
    retryable: true,
  });

describe('describeProviderError: LM Studio unreachable', () => {
  it('maps a network error to a plain, actionable message naming the address', () => {
    const result = describeProviderError(
      lmstudioError(
        'networkError',
        'LM Studio streaming error: {"message":"Network request failed"}'
      ),
      { lmstudioEndpoint: 'http://192.168.1.20:1234' }
    );
    expect(result.kind).toBe('lmstudio-unreachable');
    expect(result.action).toBe('open-connections');
    expect(result.message).toBe(
      "LM Studio isn't answering at http://192.168.1.20:1234. Start its local server, then try again."
    );
    expect(result.message).not.toMatch(/Network request failed|\{/);
  });

  it('treats a timeout (a host that never answers) as unreachable', () => {
    const result = describeProviderError(lmstudioError('timeout'));
    expect(result.kind).toBe('lmstudio-unreachable');
    expect(result.message).toBe(
      "LM Studio isn't answering. Start its local server, then try again."
    );
  });

  it('adds the phone hint when the address is localhost', () => {
    const result = describeProviderError(lmstudioError('networkError'), {
      lmstudioEndpoint: 'http://localhost:1234',
    });
    expect(result.message).toContain(
      "On a phone, use your computer's network address instead of localhost."
    );
  });

  it('maps a raw fetch TypeError when the request was for LM Studio', () => {
    const result = describeProviderError(
      new TypeError('Network request failed'),
      { provider: 'lmstudio' }
    );
    expect(result.kind).toBe('lmstudio-unreachable');
  });

  it('leaves a raw fetch error alone when the provider is not LM Studio', () => {
    const result = describeProviderError(
      new TypeError('Network request failed'),
      { provider: 'openrouter' }
    );
    expect(result.kind).toBe('other');
    expect(result.action).toBeNull();
  });

  it('does not call a model-not-found reply unreachable', () => {
    const result = describeProviderError(lmstudioError('modelNotFound'));
    expect(result.kind).toBe('other');
  });
});

describe('describeProviderError: keys', () => {
  it('points a missing key at Connections', () => {
    const result = describeProviderError(
      new MissingProviderKeyError('openrouter')
    );
    expect(result).toEqual({
      kind: 'missing-key',
      message: 'Add your OpenRouter key in Connections to generate.',
      action: 'open-connections',
    });
  });

  it('points a rejected OpenRouter key at Connections', () => {
    const result = describeProviderError(
      new LlmProviderError({
        code: 'authenticationFailed',
        message: 'No auth credentials found',
        provider: 'openrouter',
        retryable: false,
      })
    );
    expect(result.kind).toBe('key-rejected');
    expect(result.message).toBe(
      "OpenRouter didn't accept your key. Check it in Connections."
    );
  });
});

describe('describeProviderError: everything else', () => {
  it('keeps the provider detail for other provider errors', () => {
    const result = describeProviderError(
      new LlmProviderError({
        code: 'rateLimited',
        message: 'slow down',
        provider: 'openrouter',
        retryable: true,
      })
    );
    expect(result).toEqual({
      kind: 'other',
      message: '[openrouter:rateLimited] slow down',
      action: null,
    });
  });

  it('passes plain errors through', () => {
    expect(describeProviderError(new Error('nope')).message).toBe('nope');
    expect(describeProviderError('odd').message).toBe('odd');
  });
});
