import { describe, expect, it, jest } from '@jest/globals';
import {
  LlmProviderError,
  type CompletionRequest,
  type ILlmProvider,
  type StreamChunk,
} from '@application/services/llm';
import { LMStudioAdapter } from './LMStudioAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import { openStreams } from './test-support/fake-streaming-fetch';

// Real SHA-256 so hash comparisons and provenance checks mean something.
jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));

// Driven by hand: each fetch opens a stream the test pushes events into.
jest.mock('expo/fetch', () => ({
  fetch: require('./test-support/fake-streaming-fetch').fakeStreamingFetch,
}));

const request = (signal?: AbortSignal): CompletionRequest => ({
  model: 'test/model',
  messages: [{ role: 'user', content: 'hi' }],
  signal,
});

/** Collects a stream, returning its chunks or the error it threw. */
const collect = async (stream: AsyncIterable<StreamChunk>) => {
  const chunks: StreamChunk[] = [];
  try {
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return { chunks };
  } catch (error) {
    return { chunks, error };
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const adapters: [string, () => Promise<ILlmProvider>][] = [
  [
    'OpenRouterAdapter',
    async () => {
      const adapter = new OpenRouterAdapter();
      await adapter.initialize({ apiKey: 'sk-test' });
      return adapter;
    },
  ],
  [
    'LMStudioAdapter',
    async () => {
      const adapter = new LMStudioAdapter();
      await adapter.initialize({ apiKey: '' });
      return adapter;
    },
  ],
];

describe.each(adapters)('%s concurrent streams', (_name, create) => {
  it('runs several streams on one instance independently, and cancelling one leaves the others', async () => {
    openStreams.length = 0;
    const adapter = await create();
    const stopSecond = new AbortController();
    const stopThird = new AbortController();

    const first = collect(adapter.generateStreamingCompletion(request()));
    const second = collect(
      adapter.generateStreamingCompletion(request(stopSecond.signal))
    );
    const third = collect(
      adapter.generateStreamingCompletion(request(stopThird.signal))
    );
    await tick();
    expect(openStreams).toHaveLength(3);

    openStreams[0].push('one');
    openStreams[1].push('two');
    await tick();
    stopSecond.abort();
    stopThird.abort();
    await tick();
    openStreams[0].push(' more');
    openStreams[0].end();

    const [a, b, c] = await Promise.all([first, second, third]);

    // The untouched stream finishes normally with its own raw response.
    expect(a.error).toBeUndefined();
    expect(a.chunks.at(-1)).toMatchObject({
      type: 'done',
      content: 'one more',
      finishReason: 'stop',
    });
    // Cancelled after text: ends with that text, marked cancelled.
    expect(b.chunks.at(-1)).toMatchObject({
      type: 'done',
      content: 'two',
      interruptedReason: 'cancelled',
    });
    // Cancelled before text: a non-retryable `cancelled` error.
    expect(c.error).toBeInstanceOf(LlmProviderError);
    expect(c.error).toMatchObject({ code: 'cancelled', retryable: false });

    const rawA = a.chunks.at(-1)?.rawResponse;
    const rawB = b.chunks.at(-1)?.rawResponse;
    expect(rawA?.rawBytesHash).not.toBe(rawB?.rawBytesHash);
    expect(rawA?.responseBody).not.toContain('two');
  });

  it('marks a stream cut off before its terminal event as interrupted, not finished', async () => {
    openStreams.length = 0;
    const adapter = await create();
    const withText = collect(adapter.generateStreamingCompletion(request()));
    const empty = collect(adapter.generateStreamingCompletion(request()));
    await tick();

    openStreams[0].push('partial');
    await tick();
    openStreams[0].drop();
    openStreams[1].drop();

    const [a, b] = await Promise.all([withText, empty]);
    expect(a.chunks.at(-1)).toMatchObject({
      type: 'done',
      content: 'partial',
      finishReason: 'error',
      interruptedReason: 'network',
    });
    // No text yet: a retryable network error, like any failed request.
    expect(b.error).toMatchObject({ code: 'networkError', retryable: true });
  });

  it('aborts the request when the consumer stops reading early', async () => {
    openStreams.length = 0;
    const adapter = await create();
    const stream = adapter.generateStreamingCompletion(request());
    const iterator = stream[Symbol.asyncIterator]();

    const next = iterator.next();
    await tick();
    openStreams[0].push('hello');
    await next;
    await iterator.return?.();

    expect(openStreams[0].signal.aborted).toBe(true);
  });
});
