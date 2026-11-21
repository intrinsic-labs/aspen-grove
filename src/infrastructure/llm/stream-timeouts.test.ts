import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  CompletionRequest,
  ILlmProvider,
  StreamChunk,
} from '@application/services/llm';
import { LMStudioAdapter } from './LMStudioAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import type { StreamTimeouts } from './shared/stream-timeouts';
import { openStreams } from './test-support/fake-streaming-fetch';

jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));
jest.mock('expo/fetch', () => ({
  fetch: require('./test-support/fake-streaming-fetch').fakeStreamingFetch,
}));

const timeouts: StreamTimeouts = { firstByteMs: 1_000, idleMs: 500 };

const request: CompletionRequest = {
  model: 'test/model',
  messages: [{ role: 'user', content: 'hi' }],
};

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

const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

const adapters: [string, () => Promise<ILlmProvider>][] = [
  [
    'OpenRouterAdapter',
    async () => {
      const adapter = new OpenRouterAdapter(undefined, timeouts);
      await adapter.initialize({ apiKey: 'sk-test' });
      return adapter;
    },
  ],
  [
    'LMStudioAdapter',
    async () => {
      const adapter = new LMStudioAdapter({ streamTimeouts: timeouts });
      await adapter.initialize({ apiKey: '' });
      return adapter;
    },
  ],
];

describe.each(adapters)('%s stream timeouts', (_name, create) => {
  beforeEach(() => {
    jest.useFakeTimers();
    openStreams.length = 0;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lets a slow stream run far past the first-byte budget while chunks keep coming', async () => {
    const adapter = await create();
    const result = collect(adapter.generateStreamingCompletion(request));
    await advance(0);

    // First bytes just inside the first-byte budget, then a chunk every
    // 400 ms (inside the idle budget) for ten times that budget in total.
    await advance(900);
    openStreams[0].push('a');
    for (let i = 0; i < 25; i += 1) {
      await advance(400);
      openStreams[0].push('b');
    }
    openStreams[0].end();

    const { chunks, error } = await result;
    expect(error).toBeUndefined();
    expect(chunks.at(-1)).toMatchObject({
      type: 'done',
      content: `a${'b'.repeat(25)}`,
      finishReason: 'stop',
    });
    expect(chunks.at(-1)?.interruptedReason).toBeUndefined();
  });

  it('times out a stream that goes quiet for longer than the idle budget, keeping its text', async () => {
    const adapter = await create();
    const result = collect(adapter.generateStreamingCompletion(request));
    await advance(0);

    openStreams[0].push('partial');
    await advance(499);
    expect(openStreams[0].signal.aborted).toBe(false);
    await advance(1);

    const { chunks } = await result;
    expect(chunks.at(-1)).toMatchObject({
      type: 'done',
      content: 'partial',
      finishReason: 'error',
      interruptedReason: 'timeout',
    });
  });

  it('times out a request with no bytes within the first-byte budget', async () => {
    const adapter = await create();
    const result = collect(adapter.generateStreamingCompletion(request));
    await advance(0);

    // The idle budget alone doesn't apply before the first bytes.
    await advance(999);
    expect(openStreams[0].signal.aborted).toBe(false);
    await advance(1);

    const { error } = await result;
    expect(error).toMatchObject({ code: 'timeout' });
  });

  it('counts keep-alive comments as activity, not only text', async () => {
    const adapter = await create();
    const result = collect(adapter.generateStreamingCompletion(request));
    await advance(0);

    for (let i = 0; i < 6; i += 1) {
      await advance(400);
      openStreams[0].keepAlive();
    }
    await advance(400);
    openStreams[0].push('thought it over');
    openStreams[0].end();

    const { chunks, error } = await result;
    expect(error).toBeUndefined();
    expect(chunks.at(-1)).toMatchObject({
      type: 'done',
      content: 'thought it over',
      finishReason: 'stop',
    });
  });
});
