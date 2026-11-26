import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  collectCompletion,
  LlmProviderError,
  type ILlmProvider,
  type StreamChunk,
  type TextCompletionRequest,
} from '@application/services/llm';
import { AnthropicAdapter } from '../AnthropicAdapter';
import { LMStudioAdapter } from '../LMStudioAdapter';
import { OpenAIAdapter } from '../OpenAIAdapter';
import { OpenRouterAdapter } from '../OpenRouterAdapter';
import { calls, reply, reset } from '../test-support/scripted-text-fetch';

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

const textRequest = (
  overrides: Partial<TextCompletionRequest> = {}
): TextCompletionRequest => ({
  kind: 'text',
  model: 'base/model',
  prompt: 'The snow fell ',
  maxTokens: 50,
  ...overrides,
});

const sse = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const delta = (text: string) =>
  sse({
    model: 'base/model',
    choices: [{ index: 0, text, finish_reason: null }],
  });
const finish = (reason = 'stop') =>
  sse({ choices: [{ index: 0, text: '', finish_reason: reason }] });
const DONE = 'data: [DONE]\n\n';

const drain = async (stream: AsyncIterable<StreamChunk>) => {
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

const sha = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex');
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

type Create = (timeouts?: {
  firstByteMs: number;
  idleMs: number;
}) => Promise<ILlmProvider>;

const providers: [string, Create][] = [
  [
    'OpenRouterAdapter',
    async (timeouts) => {
      const adapter = new OpenRouterAdapter(45_000, timeouts);
      await adapter.initialize({ apiKey: 'sk-or-test' });
      return adapter;
    },
  ],
  [
    'LMStudioAdapter',
    async (timeouts) => {
      const adapter = new LMStudioAdapter({ streamTimeouts: timeouts });
      await adapter.initialize({ apiKey: '' }, { endpoint: 'http://lan:1234' });
      return adapter;
    },
  ],
];

beforeEach(reset);

describe('the request on the wire', () => {
  it('OpenRouter posts the exact body to its sibling /completions URL with auth', async () => {
    const adapter = new OpenRouterAdapter();
    await adapter.initialize(
      { apiKey: 'sk-or-test' },
      { appName: 'Aspen Grove', appUrl: 'https://example.test' }
    );
    reply({ chunks: [delta('x'), finish(), DONE] });

    await drain(
      adapter.generateStreamingCompletion(
        textRequest({ temperature: 0.7, stopSequences: ['\n\n'] })
      )
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/completions');
    expect(calls[0].headers).toMatchObject({
      Authorization: 'Bearer sk-or-test',
      'HTTP-Referer': 'https://example.test',
      'X-Title': 'Aspen Grove',
    });
    expect(calls[0].body).toEqual({
      model: 'base/model',
      prompt: 'The snow fell ',
      temperature: 0.7,
      max_tokens: 50,
      stop: ['\n\n'],
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it('OpenRouter keeps a custom origin, base path and query', async () => {
    const adapter = new OpenRouterAdapter();
    await adapter.initialize(
      { apiKey: 'k' },
      {
        endpoint:
          'https://gateway.test:8443/proxy/or/v1/chat/completions?team=a',
      }
    );
    reply({ chunks: [JSON.stringify({ choices: [{ text: ' a' }] })] });

    await adapter.generateCompletion(textRequest());

    expect(calls[0].url).toBe(
      'https://gateway.test:8443/proxy/or/v1/completions?team=a'
    );
  });

  it('OpenRouter refuses an endpoint that is not a chat URL, before any request', async () => {
    const adapter = new OpenRouterAdapter();
    await adapter.initialize(
      { apiKey: 'k' },
      { endpoint: 'https://x.test/v1/responses' }
    );

    const failure = await drain(
      adapter.generateStreamingCompletion(textRequest())
    );

    expect(failure.error).toMatchObject({ code: 'invalidRequest' });
    expect(calls).toHaveLength(0);
  });

  it('LM Studio posts to <origin>/v1/completions with its token, and no usage option', async () => {
    const adapter = new LMStudioAdapter();
    await adapter.initialize(
      { apiKey: 'lm-token' },
      { endpoint: 'http://192.168.1.5:1234/' }
    );
    reply({ chunks: [delta('x'), finish(), DONE] });

    await drain(
      adapter.generateStreamingCompletion(textRequest({ maxTokens: 8 }))
    );

    expect(calls[0].url).toBe('http://192.168.1.5:1234/v1/completions');
    expect(calls[0].headers.Authorization).toBe('Bearer lm-token');
    expect(calls[0].body).toEqual({
      model: 'base/model',
      prompt: 'The snow fell ',
      max_tokens: 8,
      stream: true,
    });
  });

  it('LM Studio sends no Authorization header without a token', async () => {
    const [, create] = providers[1];
    reply({ chunks: [JSON.stringify({ choices: [{ text: ' a' }] })] });

    await (await create()).generateCompletion(textRequest());

    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });

  it.each(providers)(
    '%s never sends messages, system or n',
    async (_n, create) => {
      reply({ chunks: [JSON.stringify({ choices: [{ text: ' a' }] })] });
      reply({ chunks: [delta('x'), finish(), DONE] });
      const provider = await create();

      await provider.generateCompletion(textRequest());
      await drain(provider.generateStreamingCompletion(textRequest()));

      for (const call of calls) {
        expect(Object.keys(call.body)).not.toEqual(
          expect.arrayContaining(['messages'])
        );
        for (const key of ['messages', 'system', 'n']) {
          expect(call.body).not.toHaveProperty(key);
        }
        expect(call.body.prompt).toBe('The snow fell ');
      }
    }
  );
});

describe.each(providers)('%s text decoding', (_name, create) => {
  it('returns a JSON completion verbatim, with usage and a hash of the body as received', async () => {
    const body = JSON.stringify({
      model: 'served/model',
      choices: [
        { index: 0, text: '  over the roofs.\n', finish_reason: 'length' },
      ],
      usage: { prompt_tokens: 4, completion_tokens: 6, total_tokens: 10 },
    });
    reply({ headers: { 'content-type': 'application/json' }, chunks: [body] });

    const response = await (await create()).generateCompletion(textRequest());

    expect(response.content).toBe('  over the roofs.\n');
    expect(response.finishReason).toBe('length');
    expect(response.usage).toEqual({
      promptTokens: 4,
      completionTokens: 6,
      totalTokens: 10,
    });
    expect(response.rawResponse.modelIdentifier).toBe('served/model');
    expect(response.rawResponse.responseBody).toBe(body);
    expect(response.rawResponse.rawBytesHash).toBe(
      sha(response.rawResponse.rawBytes)
    );
  });

  it('keeps UTF-8 split between chunks and a CRLF split between events, and the hash matches the bytes', async () => {
    const bytes = new TextEncoder().encode(delta(' héllo 🌲 world'));
    // Cut inside the 2-byte "é" and inside the 4-byte emoji.
    const eAt = bytes.indexOf(0xc3) + 1;
    const emojiAt = bytes.indexOf(0xf0) + 2;
    const head = new TextEncoder().encode(
      'data: {"choices":[{"text":" CRLF","finish_reason":null}]}\r'
    );
    const tail = new TextEncoder().encode('\n\r\n');
    const chunks = [
      bytes.slice(0, eAt),
      bytes.slice(eAt, emojiAt),
      bytes.slice(emojiAt),
      head,
      tail,
      new TextEncoder().encode(finish()),
      new TextEncoder().encode(DONE),
    ];
    reply({ headers: { 'content-type': 'text/event-stream' }, chunks });

    const { chunks: out } = await drain(
      (await create()).generateStreamingCompletion(textRequest())
    );

    const done = out[out.length - 1];
    expect(done.type).toBe('done');
    expect(done.content).toBe(' héllo 🌲 world CRLF');
    // Reconstruct the capture from the bytes the server sent.
    const whole = new Uint8Array(
      chunks.reduce((n, c) => n + (c as Uint8Array).length, 0)
    );
    let offset = 0;
    for (const c of chunks as Uint8Array[]) {
      whole.set(c, offset);
      offset += c.length;
    }
    const body = new TextDecoder().decode(whole);
    expect(done.rawResponse?.responseBody).toBe(body);
    expect(done.rawResponse?.rawBytes).toBe(
      `${done.rawResponse?.responseHeaders}\n\n${body}`
    );
    expect(done.rawResponse?.rawBytesHash).toBe(
      sha(`${done.rawResponse?.responseHeaders}\n\n${body}`)
    );
  });

  it('keeps whitespace-only output, and a usage-only event after the text', async () => {
    reply({
      chunks: [
        delta(' '),
        delta('\n\n'),
        finish('length'),
        sse({
          choices: [],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        }),
        DONE,
      ],
    });

    const { chunks } = await drain(
      (await create()).generateStreamingCompletion(textRequest())
    );

    expect(
      chunks.filter((c) => c.type === 'text').map((c) => c.content)
    ).toEqual([' ', '\n\n']);
    const done = chunks[chunks.length - 1];
    expect(done.content).toBe(' \n\n');
    expect(done.finishReason).toBe('length');
    expect(done.usage).toEqual({
      promptTokens: 3,
      completionTokens: 2,
      totalTokens: 5,
    });
  });

  it('keeps a whitespace-only JSON completion', async () => {
    reply({
      chunks: [
        JSON.stringify({ choices: [{ text: '   ', finish_reason: 'stop' }] }),
      ],
    });

    const response = await (await create()).generateCompletion(textRequest());

    expect(response.content).toBe('   ');
  });
});

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
