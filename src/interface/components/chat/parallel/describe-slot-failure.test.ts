import { describe, expect, it } from '@jest/globals';
import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import {
  LlmProviderError,
  MissingProviderKeyError,
} from '@application/services/llm';
import { describeSlotFailure } from './describe-slot-failure';

const failure = (cause: unknown): ContinuationSlotEvent => ({
  slot: 0,
  type: 'error',
  message: cause instanceof Error ? cause.message : String(cause),
  cause,
});

describe('describeSlotFailure', () => {
  it('words a rejected key the way a failed send does', () => {
    const rejected = new LlmProviderError({
      code: 'authenticationFailed',
      message: 'HTTP 401: invalid api key sk-...',
      provider: 'openrouter',
      retryable: false,
    });
    const described = describeSlotFailure(failure(rejected), 'openrouter');
    expect(described).toMatchObject({
      type: 'error',
      message: "OpenRouter didn't accept your key. Check it in Connections.",
    });
  });

  it('names LM Studio not answering from a raw network failure, using the run provider', () => {
    const described = describeSlotFailure(
      failure(new TypeError('Network request failed')),
      'lmstudio'
    );
    expect(described.type === 'error' && described.message).toMatch(
      /^LM Studio isn't answering/
    );
  });

  it('words a missing key', () => {
    const described = describeSlotFailure(
      failure(new MissingProviderKeyError('openrouter')),
      'openrouter'
    );
    expect(described.type === 'error' && described.message).toBe(
      'Add your OpenRouter key in Connections to generate.'
    );
  });

  it('passes other events through untouched', () => {
    const delta: ContinuationSlotEvent = {
      slot: 1,
      type: 'delta',
      delta: 'a',
      content: 'a',
    };
    expect(describeSlotFailure(delta, 'openrouter')).toBe(delta);
  });
});
