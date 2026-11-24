import { fetch as expoFetch } from 'expo/fetch';
import { computeSha256Hash } from '@application/services/content-hash-service';
import type { CompletionRequest, StreamChunk } from '@application/services/llm';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import {
  completionFixture,
  frame,
  mockResponse,
  streamFixture,
} from './test-support/direct-provider-fixtures';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));
const fetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;
const respond = (body: string, status = 200, bytewise = false) => {
  fetchMock.mockImplementation(
    async (_url, init) =>
      mockResponse(body, {
        status,
        bytewise,
        signal: init?.signal ?? undefined,
      }) as unknown as Awaited<ReturnType<typeof expoFetch>>
  );
};
const collect = async (stream: AsyncIterable<StreamChunk>) => {
  const chunks: StreamChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
};

const cases = [
  {
    provider: 'anthropic',
    Adapter: AnthropicAdapter,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-opus-5-5',
    headers: {
      'x-api-key': 'test-key',
      'anthropic-version': '2026-10-21',
      'Content-Type': 'application/json',
    },
  },
  {
    provider: 'openai',
    Adapter: OpenAIAdapter,
    endpoint: 'https://api.openai.com/v1/responses',
    model: 'gpt-6.2-astra',
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
  },
] as const;

beforeEach(() => fetchMock.mockReset());

describe.each(cases)(
  '$provider adapter',
  ({ provider, Adapter, endpoint, model, headers }) => {
    const request: CompletionRequest = {
      model,
      systemPrompt: ' Agent prompt ',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: 'Earlier reply' },
        { role: 'system', content: 'Tree instruction' },
        { role: 'user', content: 'Continue' },
      ],
      maxTokens: 128,
      temperature: 0.7,
    };
    const setup = async (timeoutMs?: number, idleMs = 45_000) => {
      const adapter = new Adapter(timeoutMs, { firstByteMs: idleMs, idleMs });
      expect(await adapter.initialize({ apiKey: ' test-key ' })).toBe(true);
      return adapter;
    };
    const expectedBody = (stream: boolean) =>
      provider === 'anthropic'
        ? {
            model,
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Earlier reply' },
              { role: 'user', content: 'Continue' },
            ],
            system: 'Agent prompt\n\nTree instruction',
            max_tokens: 128,
            stream,
          }
        : {
            model,
            instructions: 'Agent prompt',
            input: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Earlier reply' },
              { role: 'system', content: 'Tree instruction' },
              { role: 'user', content: 'Continue' },
            ],
            max_output_tokens: 128,
            store: false,
            stream,
          };

    it('sends the exact URL, auth headers, body and system placement for a plain request', async () => {
      respond(JSON.stringify(completionFixture(provider)));
      const adapter = await setup();
      const result = await adapter.generateCompletion(request);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(endpoint);
      expect(init).toMatchObject({ method: 'POST', headers });
      expect(JSON.parse(init?.body as string)).toEqual(expectedBody(false));
      expect(result).toMatchObject({
        content: 'Hi 🌲',
        finishReason: 'stop',
        usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
        rawResponse: { requestId: 'req-1', modelIdentifier: 'actual-model' },
      });
      expect(result.rawResponse.rawBytesHash).toBe(
        await computeSha256Hash(result.rawResponse.rawBytes)
      );
      expect(result.rawResponse.rawBytesHash).toHaveLength(64);
    });

    it('streams split UTF-8, pings, usage and terminal events without repeating final text', async () => {
      const body = streamFixture(provider);
      respond(body, 200, true);
      const adapter = await setup();
      const chunks = await collect(
        adapter.generateStreamingCompletion(request)
      );
      expect(
        chunks
          .filter((chunk) => chunk.type === 'text')
          .map((chunk) => chunk.content)
          .join('')
      ).toBe('Hi 🌲');
      expect(chunks.at(-1)).toMatchObject({
        type: 'done',
        content: 'Hi 🌲',
        finishReason: 'stop',
        usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
      });
      expect(fetchMock.mock.calls[0][0]).toBe(endpoint);
      expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
        ...headers,
        Accept: 'text/event-stream',
      });
      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(
        expectedBody(true)
      );
      const raw = chunks.at(-1)?.rawResponse;
      expect(raw?.responseBody).toBe(body);
      expect(raw?.rawBytes).toBe(`${raw?.responseHeaders}\n\n${body}`);
      expect(raw?.rawBytesHash).toBe(await computeSha256Hash(raw!.rawBytes));
      respond(body);
      const whole = await collect(adapter.generateStreamingCompletion(request));
      expect(whole.at(-1)?.rawResponse?.rawBytesHash).toBe(raw?.rawBytesHash);
    });

    it('maps an output token limit to length', async () => {
      respond(streamFixture(provider, 'limited', true));
      expect(
        (
          await collect((await setup()).generateStreamingCompletion(request))
        ).at(-1)?.finishReason
      ).toBe('length');
    });

    it('preserves raw partial text and marks a missing terminal event as a network interruption', async () => {
      const body =
        provider === 'anthropic'
          ? frame('content_block_delta', {
              delta: { type: 'text_delta', text: 'partial' },
            })
          : frame('response.output_text.delta', { delta: 'partial' });
      respond(body);
      const chunks = await collect(
        (await setup()).generateStreamingCompletion(request)
      );
      expect(chunks.at(-1)).toMatchObject({
        content: 'partial',
        interruptedReason: 'network',
        finishReason: 'error',
        rawResponse: { responseBody: body },
      });
      respond(': ping\n\n');
      await expect(
        collect((await setup()).generateStreamingCompletion(request))
      ).rejects.toMatchObject({ code: 'networkError', retryable: true });
    });

    it('aborts before text, and preserves partial text on Stop', async () => {
      const adapter = await setup();
      const controller = new AbortController();
      controller.abort();
      respond(streamFixture(provider));
      await expect(
        collect(
          adapter.generateStreamingCompletion({
            ...request,
            signal: controller.signal,
          })
        )
      ).rejects.toMatchObject({ code: 'cancelled', retryable: false });
      const stop = new AbortController();
      const iterator = adapter
        .generateStreamingCompletion({ ...request, signal: stop.signal })
        [Symbol.asyncIterator]();
      expect((await iterator.next()).value).toMatchObject({ type: 'text' });
      stop.abort();
      expect((await iterator.next()).value).toMatchObject({
        type: 'done',
        interruptedReason: 'cancelled',
        finishReason: 'error',
        content: 'Hi 🌲',
      });
      await iterator.return?.();
    });

    it('keeps abort controllers independent during three parallel continuations', async () => {
      respond(streamFixture(provider));
      const adapter = await setup();
      const stops = [
        new AbortController(),
        new AbortController(),
        new AbortController(),
      ];
      const iterators = stops.map((stop) =>
        adapter
          .generateStreamingCompletion({ ...request, signal: stop.signal })
          [Symbol.asyncIterator]()
      );
      await Promise.all(iterators.map((iterator) => iterator.next()));
      stops[1].abort();
      const results = await Promise.all(
        iterators.map((iterator) => iterator.next())
      );
      expect(results.map((result) => result.value?.interruptedReason)).toEqual([
        undefined,
        'cancelled',
        undefined,
      ]);
      await Promise.all(iterators.map((iterator) => iterator.return?.()));
    });

    it.each([401, 403, 404, 408, 429, 500, 504, 413, 400, 422])(
      'maps HTTP %i for both paths',
      async (status) => {
        const expected: Record<number, string> = {
          401: 'authenticationFailed',
          403: 'authenticationFailed',
          404: 'modelNotFound',
          408: 'timeout',
          429: 'rateLimited',
          500: 'serverError',
          504: 'timeout',
          413: 'contextTooLong',
          400: 'invalidRequest',
          422: 'invalidRequest',
        };
        respond(
          JSON.stringify({ error: { message: 'sensitive provider detail' } }),
          status
        );
        const adapter = await setup();
        for (const operation of [
          () => adapter.generateCompletion(request),
          () => collect(adapter.generateStreamingCompletion(request)),
        ]) {
          await expect(operation()).rejects.toMatchObject({
            code: expected[status],
            provider,
            ...(status === 429 ? { retryAfterMs: 2000 } : {}),
          });
        }
      }
    );

    it('maps a provider error event before text and retains partial text after one', async () => {
      const body = frame(
        'error',
        provider === 'anthropic'
          ? { error: { type: 'rate_limit_error', message: 'busy' } }
          : { code: 'rate_limit_exceeded', message: 'busy' }
      );
      respond(body);
      const adapter = await setup();
      await expect(
        collect(adapter.generateStreamingCompletion(request))
      ).rejects.toMatchObject({ code: 'rateLimited', provider });
      const delta =
        provider === 'anthropic'
          ? frame('content_block_delta', {
              delta: { type: 'text_delta', text: 'part' },
            })
          : frame('response.output_text.delta', { delta: 'part' });
      respond(delta + body);
      expect(
        (await collect(adapter.generateStreamingCompletion(request))).at(-1)
      ).toMatchObject({
        content: 'part',
        interruptedReason: 'provider_error',
        rawResponse: { responseBody: delta + body },
      });
    });

    it('maps first-byte, idle, and non-streaming timeouts', async () => {
      fetchMock.mockImplementation(async (_url, init) => {
        await new Promise<void>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          })
        );
        throw new Error('unreachable');
      });
      const adapter = await setup(5, 5);
      await expect(
        collect(adapter.generateStreamingCompletion(request))
      ).rejects.toMatchObject({ code: 'timeout' });
      await expect(adapter.generateCompletion(request)).rejects.toMatchObject({
        code: 'timeout',
      });
      const delta =
        provider === 'anthropic'
          ? frame('content_block_delta', {
              delta: { type: 'text_delta', text: 'part' },
            })
          : frame('response.output_text.delta', { delta: 'part' });
      fetchMock.mockImplementation(
        async (_url, init) =>
          mockResponse(delta, {
            hang: true,
            signal: init?.signal ?? undefined,
          }) as unknown as Awaited<ReturnType<typeof expoFetch>>
      );
      expect(
        (await collect(adapter.generateStreamingCompletion(request))).at(-1)
      ).toMatchObject({ interruptedReason: 'timeout', content: 'part' });
    });

    it('requires a key, rejects images and invalid token limits, and keeps endpoint overrides', async () => {
      const adapter = new Adapter();
      expect(await adapter.initialize({ apiKey: ' ' })).toBe(false);
      await expect(
        collect(adapter.generateStreamingCompletion(request))
      ).rejects.toMatchObject({ code: 'authenticationFailed' });
      await adapter.initialize(
        { apiKey: 'test-key' },
        { endpoint: 'http://localhost:1235/v1/custom' }
      );
      await adapter.initialize({ apiKey: 'test-key' });
      respond(JSON.stringify(completionFixture(provider)));
      await adapter.generateCompletion(request);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://localhost:1235/v1/custom'
      );
      await expect(
        adapter.generateCompletion({ ...request, maxTokens: -1 })
      ).rejects.toMatchObject({ code: 'invalidRequest' });
      await expect(
        adapter.generateCompletion({
          ...request,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'url', data: 'x', mediaType: 'image/png' },
                },
              ],
            },
          ],
        })
      ).rejects.toMatchObject({ code: 'invalidRequest' });
    });
  }
);
