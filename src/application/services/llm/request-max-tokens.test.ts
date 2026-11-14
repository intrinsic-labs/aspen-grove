import { describe, expect, it, jest } from '@jest/globals';
import type { IModelOutputLimits } from './IModelOutputLimits';
import { requestMaxTokens } from './request-max-tokens';

const target = { provider: 'openrouter', model: 'a/b' } as const;
const limitOf = (limit: number | undefined): IModelOutputLimits => ({
  maxOutputTokens: async () => limit,
});

describe('requestMaxTokens', () => {
  it('caps the configured value at a known limit', async () => {
    await expect(requestMaxTokens(32768, target, limitOf(2048))).resolves.toBe(
      2048
    );
    await expect(requestMaxTokens(1000, target, limitOf(2048))).resolves.toBe(
      1000
    );
  });

  it('sends the configured value when the limit is unknown or unusable', async () => {
    await expect(
      requestMaxTokens(32768, target, limitOf(undefined))
    ).resolves.toBe(32768);
    await expect(requestMaxTokens(32768, target, limitOf(0))).resolves.toBe(
      32768
    );
    const failing: IModelOutputLimits = {
      maxOutputTokens: async () => {
        throw new Error('cache unreadable');
      },
    };
    await expect(requestMaxTokens(32768, target, failing)).resolves.toBe(32768);
  });

  it("leaves no value unset and doesn't look one up", async () => {
    const lookup = jest.fn(async () => 2048);
    await expect(
      requestMaxTokens(undefined, target, { maxOutputTokens: lookup })
    ).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('asks about the provider and model the request goes to', async () => {
    const lookup = jest.fn(async () => 2048);
    await requestMaxTokens(4096, target, { maxOutputTokens: lookup });
    expect(lookup).toHaveBeenCalledWith('openrouter', 'a/b');
  });
});
