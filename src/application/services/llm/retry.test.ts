import { describe, expect, it } from '@jest/globals';
import { LlmProviderError } from './ILlmProvider';
import { isRetryableLlmError, withRetry } from './retry';

const createRetryableError = (retryAfterMs?: number): LlmProviderError =>
  new LlmProviderError({
    code: 'serverError',
    message: 'Provider blew up',
    provider: 'openrouter',
    retryable: true,
    retryAfterMs,
  });

const createNonRetryableError = (): LlmProviderError =>
  new LlmProviderError({
    code: 'invalidRequest',
    message: 'Bad request',
    provider: 'openrouter',
    retryable: false,
  });

describe('withRetry', () => {
  it('returns the result without retrying when the operation succeeds', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts += 1;
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(attempts).toBe(1);
  });

  it('retries retryable errors with exponential backoff and then succeeds', async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw createRetryableError();
        }
        return 'recovered';
      },
      { sleep: async (ms) => void sleeps.push(ms) }
    );

    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([500, 1500]);
  });

  it('throws the last error once retries are exhausted', async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw createRetryableError();
        },
        { sleep: async (ms) => void sleeps.push(ms) }
      )
    ).rejects.toThrow('Provider blew up');

    expect(attempts).toBe(3);
    expect(sleeps).toEqual([500, 1500]);
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw createNonRetryableError();
        },
        { sleep: async () => {} }
      )
    ).rejects.toThrow('Bad request');

    expect(attempts).toBe(1);
  });

  it('does not retry plain errors by default', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error('not a provider error');
        },
        { sleep: async () => {} }
      )
    ).rejects.toThrow('not a provider error');

    expect(attempts).toBe(1);
  });

  it('prefers the provider retryAfterMs hint over the backoff schedule', async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw createRetryableError(2500);
        }
        return 'ok';
      },
      { sleep: async (ms) => void sleeps.push(ms) }
    );

    expect(result).toBe('ok');
    expect(sleeps).toEqual([2500]);
  });
});

describe('isRetryableLlmError', () => {
  it('accepts retryable provider errors only', () => {
    expect(isRetryableLlmError(createRetryableError())).toBe(true);
    expect(isRetryableLlmError(createNonRetryableError())).toBe(false);
    expect(isRetryableLlmError(new Error('nope'))).toBe(false);
    expect(isRetryableLlmError(undefined)).toBe(false);
  });
});
