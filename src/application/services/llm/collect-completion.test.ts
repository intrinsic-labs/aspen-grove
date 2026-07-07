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

  it('keeps partial streamed output and appends interruption marker', async () => {
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
        yield { type: 'text', content: 'Partial text' };
        yield {
          type: 'done',
          content: 'Partial text',
          finishReason: 'error',
          interruptedReason: 'timeout',
          rawResponse: {
            rawBytes: 'raw-partial',
            rawBytesHash:
              'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as ContentHash,
            requestTimestamp: new Date('2026-02-24T00:00:00.000Z'),
            responseTimestamp: new Date('2026-02-24T00:00:01.000Z'),
            latencyMs: 1000,
            responseBody: 'raw-partial',
            responseHeaders: 'x-request-id: req-1',
          },
        };
      },
    };

    const completion = await collectCompletion({
      llmProvider: provider,
      request: createRequest(),
      stream: true,
    });

    expect(completion.finishReason).toBe('error');
    expect(completion.interruptionReason).toBe('timeout');
    expect(completion.content).toContain('Partial text');
    expect(completion.content).toContain('[stream interrupted: timeout]');
  });

  it('retries a retryable non-streaming failure and then succeeds', async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    const provider: ILlmProvider = {
      provider: 'openrouter',
      initialize: async () => true,
      getCapabilities: () => ({
        supportsStreaming: true,
        supportsSystemPrompt: false,
        supportedModels: [],
      }),
      generateCompletion: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new LlmProviderError({
            code: 'serverError',
            message: 'Transient upstream failure',
            provider: 'openrouter',
            retryable: true,
          });
        }
        return {
          content: 'eventual response',
          finishReason: 'stop',
          rawResponse: {
            rawBytes: 'raw',
            rawBytesHash:
              'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as ContentHash,
            requestTimestamp: new Date('2026-02-24T00:00:00.000Z'),
            responseTimestamp: new Date('2026-02-24T00:00:01.000Z'),
            latencyMs: 1000,
            responseBody: '{}',
            responseHeaders: '',
          },
        };
      },
      generateStreamingCompletion: async function* () {
        throw new Error('should not call generateStreamingCompletion in this test');
      },
    };

    const completion = await collectCompletion({
      llmProvider: provider,
      request: createRequest(),
      stream: false,
      retry: { sleep: async (ms) => void sleeps.push(ms) },
    });

    expect(attempts).toBe(3);
    expect(sleeps).toEqual([500, 1500]);
    expect(completion.content).toBe('eventual response');
  });

  it('retries a streaming failure when no chunks were received yet', async () => {
    const sleeps: number[] = [];
    let attempts = 0;

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
        attempts += 1;
        if (attempts === 1) {
          throw new LlmProviderError({
            code: 'networkError',
            message: 'Connection dropped before first chunk',
            provider: 'openrouter',
            retryable: true,
          });
        }
        yield { type: 'text', content: 'Recovered' };
        yield {
          type: 'done',
          finishReason: 'stop',
          rawResponse: {
            rawBytes: 'raw',
            rawBytesHash:
              'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as ContentHash,
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
      retry: { sleep: async (ms) => void sleeps.push(ms) },
    });

    expect(attempts).toBe(2);
    expect(sleeps).toEqual([500]);
    expect(completion.content).toBe('Recovered');
    expect(completion.finishReason).toBe('stop');
  });

  it('does not retry a streaming failure after chunks were received', async () => {
    let attempts = 0;

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
        attempts += 1;
        yield { type: 'text', content: 'Already streamed' };
        throw new LlmProviderError({
          code: 'serverError',
          message: 'Mid-stream failure',
          provider: 'openrouter',
          retryable: true,
        });
      },
    };

    await expect(
      collectCompletion({
        llmProvider: provider,
        request: createRequest(),
        stream: true,
        retry: { sleep: async () => {} },
      })
    ).rejects.toThrow('Mid-stream failure');

    expect(attempts).toBe(1);
  });
});
