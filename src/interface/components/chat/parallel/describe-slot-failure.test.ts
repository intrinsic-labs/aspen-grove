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
    const described = describeSlotFailure(failure(rejected), {
      provider: 'openrouter',
    });
    expect(described).toMatchObject({
      type: 'error',
      message: "OpenRouter didn't accept your key. Check it in Connections.",
    });
  });

  it('names LM Studio not answering from a raw network failure, using the run provider', () => {
    const described = describeSlotFailure(
      failure(new TypeError('Network request failed')),
      { provider: 'lmstudio' }
    );
    expect(described.type === 'error' && described.message).toBe(
      "LM Studio isn't answering. Start its local server, then try again."
    );
  });

  it('names the LM Studio address in a card-sized form', () => {
    const described = describeSlotFailure(
      failure(new TypeError('Network request failed')),
      { provider: 'lmstudio', lmstudioEndpoint: 'http://192.168.1.20:1234' }
    );
    expect(described.type === 'error' && described.message).toBe(
      "LM Studio isn't answering at\nhttp://192.168.1.20:1234\nStart its server, then try again."
    );
  });

  it('adds a short phone hint when the address is localhost', () => {
    const described = describeSlotFailure(
      failure(new TypeError('Network request failed')),
      { provider: 'lmstudio', lmstudioEndpoint: ' http://localhost:1234 ' }
    );
    expect(described.type === 'error' && described.message).toBe(
      "LM Studio isn't answering at\nhttp://localhost:1234\nStart its server, then try again.\nOn a phone, use your computer's address."
    );
  });

  it('words a missing key', () => {
    const described = describeSlotFailure(
      failure(new MissingProviderKeyError('openrouter')),
      { provider: 'openrouter' }
    );
    expect(described.type === 'error' && described.message).toBe(
      'Add your OpenRouter key in Connections to generate.'
    );
  });

  it('words any other provider failure as one plain line, never the raw form', () => {
    const described = describeSlotFailure(
      failure(
        new LlmProviderError({
          code: 'unknown',
          message: 'Injected failure on request #4.',
          provider: 'lmstudio',
          retryable: false,
        })
      ),
      { provider: 'lmstudio' }
    );
    expect(described.type === 'error' && described.message).toBe(
      'LM Studio returned an error.'
    );
  });

  it('passes other events through untouched', () => {
    const delta: ContinuationSlotEvent = {
      slot: 1,
      type: 'delta',
      delta: 'a',
      content: 'a',
    };
    expect(describeSlotFailure(delta, { provider: 'openrouter' })).toBe(delta);
  });
});
