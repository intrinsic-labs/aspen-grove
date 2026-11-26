import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { collectCompletion, LlmProviderError } from '@application/services/llm';
import { AnthropicAdapter } from '../AnthropicAdapter';
import { OpenAIAdapter } from '../OpenAIAdapter';
import { calls, reply, reset } from '../test-support/scripted-text-fetch';
import {
  DONE,
  delta,
  drain,
  finish,
  providers,
  sha,
  sse,
  textRequest,
  tick,
} from '../test-support/text-completion-fixtures';

// Real SHA-256, so the hash comparisons mean something.
jest.mock('expo-crypto', () =>
  require('../../../test-support/node-expo-crypto')
);
jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) =>
    (
      require('../test-support/scripted-text-fetch') as {
        scriptedFetch: (...a: unknown[]) => unknown;
      }
    ).scriptedFetch(...args),
}));

beforeEach(reset);

describe.each(providers)('%s failures and stopping', (_name, create) => {
  it('maps 401 to authenticationFailed and 404 to modelNotFound, without retrying a stream', async () => {
    reply({
      status: 401,
      chunks: [JSON.stringify({ error: { message: 'bad key' } })],
    });
    reply({
      status: 404,
      chunks: [JSON.stringify({ error: { message: 'no such model' } })],
    });
    const provider = await create();

    const unauthorized = await drain(
      provider.generateStreamingCompletion(textRequest())
    );
    const missing = await drain(
      provider.generateStreamingCompletion(textRequest())
    );

    expect(unauthorized.error).toMatchObject({
      code: 'authenticationFailed',
      retryable: false,
    });
    expect(missing.error).toMatchObject({
      code: 'modelNotFound',
      retryable: false,
    });
    expect(calls).toHaveLength(2);
  });

  it('maps a non-streaming 401 and 404 the same way', async () => {
    reply({ status: 401, chunks: ['{}'] });
    reply({ status: 404, chunks: ['{}'] });
    const provider = await create();

    await expect(
      provider.generateCompletion(textRequest())
    ).rejects.toMatchObject({
      code: 'authenticationFailed',
    });
    await expect(
      provider.generateCompletion(textRequest())
    ).rejects.toMatchObject({
      code: 'modelNotFound',
    });
  });

  it('times out waiting for the first bytes with no text to keep', async () => {
    reply({ hang: true });
    const provider = await create({ firstByteMs: 20, idleMs: 20 });

    const { chunks, error } = await drain(
      provider.generateStreamingCompletion(textRequest())
    );

    expect(chunks).toEqual([]);
    expect(error).toMatchObject({ code: 'timeout' });
  });

  it('keeps the text so far when the stream then goes quiet', async () => {
    reply({ chunks: [delta(' so far')], hang: true });
    const provider = await create({ firstByteMs: 500, idleMs: 20 });

    const { chunks, error } = await drain(
      provider.generateStreamingCompletion(textRequest())
    );

    expect(error).toBeUndefined();
    expect(chunks[chunks.length - 1]).toMatchObject({
      type: 'done',
      content: ' so far',
      interruptedReason: 'timeout',
    });
  });

  it('cancelling before any text throws cancelled', async () => {
    reply({ hang: true });
    const stop = new AbortController();
    const provider = await create();

    const pending = drain(
      provider.generateStreamingCompletion(textRequest({ signal: stop.signal }))
    );
    await tick();
    stop.abort();

    expect((await pending).error).toMatchObject({ code: 'cancelled' });
  });

  it('cancelling after a lone space keeps that space as a partial, reason out of band', async () => {
    reply({ chunks: [delta(' ')], hang: true });
    const stop = new AbortController();
    const provider = await create();

    const pending = drain(
      provider.generateStreamingCompletion(textRequest({ signal: stop.signal }))
    );
    await tick();
    stop.abort();
    const { chunks, error } = await pending;

    expect(error).toBeUndefined();
    const done = chunks[chunks.length - 1];
    expect(done).toMatchObject({
      type: 'done',
      content: ' ',
      interruptedReason: 'cancelled',
      finishReason: 'error',
    });
    expect(done.rawResponse?.rawBytesHash).toBe(
      sha(done.rawResponse!.rawBytes)
    );
  });

  it('a provider error event before text throws; after text it ends the stream with provider_error', async () => {
    const event = sse({ error: { code: 429, message: 'slow down' } });
    reply({ chunks: [event] });
    reply({ chunks: [delta(' kept'), event] });
    const provider = await create();

    const before = await drain(
      provider.generateStreamingCompletion(textRequest())
    );
    const after = await drain(
      provider.generateStreamingCompletion(textRequest())
    );

    expect(before.error).toMatchObject({ code: 'rateLimited' });
    const done = after.chunks[after.chunks.length - 1];
    expect(done).toMatchObject({
      content: ' kept',
      interruptedReason: 'provider_error',
    });
  });

  it('a stream cut with no terminal event is not passed off as finished', async () => {
    reply({ chunks: [delta(' cut')] });
    const provider = await create();

    const { chunks } = await drain(
      provider.generateStreamingCompletion(textRequest())
    );

    expect(chunks[chunks.length - 1]).toMatchObject({
      type: 'done',
      content: ' cut',
      finishReason: 'error',
      interruptedReason: 'network',
    });
  });
});

describe.each(providers)('%s through the collector', (_name, create) => {
  const retry = { sleep: async () => undefined };

  it('retries a failure before the first token', async () => {
    reply({
      status: 503,
      chunks: [JSON.stringify({ error: { message: 'busy' } })],
    });
    reply({ chunks: [delta(' second try'), finish(), DONE] });

    const response = await collectCompletion({
      llmProvider: await create(),
      request: textRequest(),
      stream: true,
      retry,
    });

    expect(calls).toHaveLength(2);
    expect(response.content).toBe(' second try');
  });

  it('does not replay after text arrived, and leaves the partial literal', async () => {
    reply({
      chunks: [
        delta(' half a'),
        sse({ error: { code: 500, message: 'boom' } }),
      ],
    });
    reply({ chunks: [delta(' never used'), finish(), DONE] });

    const response = await collectCompletion({
      llmProvider: await create(),
      request: textRequest(),
      stream: true,
      retry,
    });

    expect(calls).toHaveLength(1);
    expect(response.content).toBe(' half a');
    expect(response.content).not.toContain('interrupted');
    expect(response.interruptionReason).toBe('provider_error');
  });

  it('adds no marker to a network cut, and keeps a whitespace-only partial', async () => {
    reply({ chunks: [delta('\n ')], drop: true });

    const response = await collectCompletion({
      llmProvider: await create(),
      request: textRequest(),
      stream: true,
      retry,
    });

    expect(response.content).toBe('\n ');
    expect(response.interruptionReason).toBe('network');
    expect(calls).toHaveLength(1);
  });

  it('does not fall back to a plain request after a stream that had text', async () => {
    reply({ chunks: [delta(' x')], drop: true });

    await collectCompletion({
      llmProvider: await create(),
      request: textRequest(),
      stream: true,
      retry,
    });

    expect(calls.every((call) => call.body.stream === true)).toBe(true);
  });
});

describe('hosted chat providers', () => {
  it.each([
    [
      'Anthropic',
      async () => {
        const adapter = new AnthropicAdapter();
        await adapter.initialize({ apiKey: 'sk-ant-test' });
        return adapter;
      },
    ],
    [
      'OpenAI',
      async () => {
        const adapter = new OpenAIAdapter();
        await adapter.initialize({ apiKey: 'sk-test' });
        return adapter;
      },
    ],
  ])(
    '%s rejects a text request with invalidRequest, off the network',
    async (_n, create) => {
      const provider = await create();

      await expect(
        provider.generateCompletion(textRequest())
      ).rejects.toMatchObject({
        name: 'LlmProviderError',
        code: 'invalidRequest',
        retryable: false,
      });
      const { error } = await drain(
        provider.generateStreamingCompletion(textRequest())
      );
      expect(error).toBeInstanceOf(LlmProviderError);
      expect(error).toMatchObject({ code: 'invalidRequest' });
      expect(calls).toHaveLength(0);
    }
  );
});
