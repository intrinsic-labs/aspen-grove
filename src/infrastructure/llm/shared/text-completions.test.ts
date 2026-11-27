import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AnthropicAdapter } from '../AnthropicAdapter';
import { LMStudioAdapter } from '../LMStudioAdapter';
import { OpenRouterAdapter } from '../OpenRouterAdapter';
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
