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
      "LM Studio isn't answering at this address:\nhttp://192.168.1.20:1234\nStart its local server, then try again."
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
  it('gives other provider errors a plain line and keeps the raw form as detail', () => {
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
      message:
        'OpenRouter is limiting requests right now. Wait a moment, then try again.',
      action: null,
      detail: '[openrouter:rateLimited] slow down',
    });
  });

  it("says an unknown LM Studio failure plainly (the mock's injected failure)", () => {
    const result = describeProviderError(
      lmstudioError('unknown', 'Injected failure on request #4.')
    );
    expect(result.message).toBe('LM Studio returned an error.');
    expect(result.detail).toBe(
      '[lmstudio:unknown] Injected failure on request #4.'
    );
  });

  it('passes plain errors through, with no detail to repeat', () => {
    expect(describeProviderError(new Error('nope'))).toEqual({
      kind: 'other',
      message: 'nope',
      action: null,
    });
    expect(describeProviderError('odd').message).toBe('odd');
    expect(describeProviderError('odd').detail).toBeUndefined();
  });
});

describe('describeProviderError: no failure shows its raw form', () => {
  const codes: LlmProviderError['code'][] = [
    'authenticationFailed',
    'rateLimited',
    'contextTooLong',
    'modelNotFound',
    'invalidRequest',
    'serverError',
    'networkError',
    'timeout',
    'contentFiltered',
    'cancelled',
    'unknown',
  ];

  const providers: LlmProviderError['provider'][] = ['openrouter', 'lmstudio'];
  it.each(
    providers.flatMap((provider) =>
      codes.map(
        (code): [LlmProviderError['provider'], LlmProviderError['code']] => [
          provider,
          code,
        ]
      )
    )
  )('%s %s', (provider, code) => {
    const error = new LlmProviderError({
      code,
      message: 'HTTP 500: {"error":"raw body"}',
      provider,
      retryable: false,
    });
    const result = describeProviderError(error);
    expect(result.message).not.toMatch(/\[(openrouter|lmstudio):/);
    expect(result.message).not.toContain('raw body');
    expect(result.message).not.toMatch(/\blmstudio\b|\bopenrouter\b/);
    expect(result.detail).toBe(
      `[${provider}:${code}] HTTP 500: {"error":"raw body"}`
    );
  });

  it('keeps the friendly mappings and still offers the raw form as detail', () => {
    const unreachable = describeProviderError(
      lmstudioError('networkError', 'Network request failed')
    );
    expect(unreachable.kind).toBe('lmstudio-unreachable');
    expect(unreachable.detail).toBe(
      '[lmstudio:networkError] Network request failed'
    );
  });
});
