import { describe, expect, it } from '@jest/globals';
import type {
  CompletionRequest,
  ILlmProvider,
} from './ILlmProvider';
import { LlmProviderError } from './ILlmProvider';
import { collectCompletion } from './collect-completion';
import type { ContentHash } from '@domain/value-objects';

const createRequest = (): CompletionRequest => ({
  model: 'anthropic/claude-haiku-4.5',
  messages: [{ role: 'user', content: 'hello' }],
});

describe('collectCompletion', () => {
  it('assembles streaming chunks into one completion', async () => {
    const provider: ILlmProvider = {
      provider: 'openrouter',
      initialize: async () => true,
      getCapabilities: () => ({
        supportsStreaming: true,
        supportsSystemPrompt: false,
        supportedModels: [],
      }),
      generateCompletion: async () => {
        throw new Error('should not call generateCompletion in this test');
      },
      generateStreamingCompletion: async function* () {
        yield { type: 'text', content: 'Hello' };
        yield { type: 'text', content: ' world' };
        yield {
          type: 'done',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
          rawResponse: {
            rawBytes: 'raw',
            rawBytesHash:
              'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ContentHash,
            requestTimestamp: new Date('2026-02-24T00:00:00.000Z'),
            responseTimestamp: new Date('2026-02-24T00:00:01.000Z'),
            latencyMs: 1000,
            responseBody: '{}',
            responseHeaders: '',
          },
        };
      },
    };

    const completion = await collectCompletion({
      llmProvider: provider,
      request: createRequest(),
      stream: true,
    });

    expect(completion.content).toBe('Hello world');
    expect(completion.finishReason).toBe('stop');
    expect(completion.usage?.totalTokens).toBe(3);
  });

  it('falls back to non-streaming when provider reports invalidRequest', async () => {
    let nonStreamingCalled = false;

    const provider: ILlmProvider = {
      provider: 'openrouter',
      initialize: async () => true,
      getCapabilities: () => ({
        supportsStreaming: true,
        supportsSystemPrompt: false,
        supportedModels: [],
      }),
      generateCompletion: async () => {
        nonStreamingCalled = true;
        return {
          content: 'fallback response',
          finishReason: 'stop',
          rawResponse: {
            rawBytes: 'raw',
            rawBytesHash:
              'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as ContentHash,
            requestTimestamp: new Date('2026-02-24T00:00:00.000Z'),
            responseTimestamp: new Date('2026-02-24T00:00:01.000Z'),
            latencyMs: 1000,
            responseBody: '{}',
            responseHeaders: '',
          },
        };
      },
      generateStreamingCompletion: async function* () {
        throw new LlmProviderError({
          code: 'invalidRequest',
          message: 'Streaming not supported by runtime',
          provider: 'openrouter',
          retryable: false,
        });
      },
    };

    const completion = await collectCompletion({
      llmProvider: provider,
      request: createRequest(),
      stream: true,
    });

    expect(nonStreamingCalled).toBe(true);
    expect(completion.content).toBe('fallback response');
  });
});
