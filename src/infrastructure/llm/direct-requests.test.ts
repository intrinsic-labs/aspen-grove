import { fetch as expoFetch } from 'expo/fetch';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { anthropicBody } from './anthropic/request';
import { openAIBody } from './openai/request';
import {
  completionFixture,
  frame,
  mockResponse,
} from './test-support/direct-provider-fixtures';
import type { StreamChunk } from '@application/services/llm';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-crypto', () => require('../../test-support/node-expo-crypto'));
const fetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;
const request = {
  model: 'example',
  messages: [{ role: 'user', content: 'Hi' }],
} as const;
const collect = async (stream: AsyncIterable<StreamChunk>) => {
  const chunks: StreamChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
};
beforeEach(() => fetchMock.mockReset());

it('supplies Anthropic max_tokens, top-level stop sequences, and omits empty system and removed sampling settings', () => {
  expect(
    anthropicBody({ ...request, temperature: 0, stopSequences: ['END'] }, true)
  ).toEqual({
    model: 'example',
    messages: request.messages,
    max_tokens: 4096,
    stop_sequences: ['END'],
    stream: true,
  });
});
it('rejects stop sequences in Responses and omits undefined limits', () => {
  expect(() =>
    openAIBody({ ...request, stopSequences: ['END'] }, true)
  ).toThrow('does not support stop sequences');
  expect(JSON.parse(JSON.stringify(openAIBody(request, true)))).toEqual({
    model: 'example',
    input: request.messages,
    store: false,
    stream: true,
  });
  expect(
    openAIBody({ ...request, model: 'gpt-4.1', temperature: 0.4 }, false)
  ).toMatchObject({ temperature: 0.4 });
  expect(
    openAIBody({ ...request, model: 'gpt-6.2-astra', temperature: 0.4 }, false)
  ).not.toHaveProperty('temperature');
});
it('preserves an explicit Anthropic workspace on completion and discovery, clearing it for a new key', async () => {
  const adapter = new AnthropicAdapter();
  await adapter.initialize(
    { apiKey: 'key' },
    { workspaceId: ' wrkspc_example ' }
  );
  await adapter.initialize({ apiKey: 'key' });
  fetchMock.mockResolvedValue(
    mockResponse(
      JSON.stringify(completionFixture('anthropic'))
    ) as unknown as Awaited<ReturnType<typeof expoFetch>>
  );
  await adapter.generateCompletion(request);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
    'anthropic-workspace-id': 'wrkspc_example',
  });
  fetchMock.mockResolvedValue(
    mockResponse(
      JSON.stringify({ data: [{ id: 'model' }], has_more: false })
    ) as unknown as Awaited<ReturnType<typeof expoFetch>>
  );
  await adapter.fetchModels();
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
    'anthropic-workspace-id': 'wrkspc_example',
  });
  await adapter.initialize({ apiKey: 'different-key' });
  await adapter.fetchModels();
  expect(fetchMock.mock.calls[2][1]?.headers).not.toHaveProperty(
    'anthropic-workspace-id'
  );
});
it.each([AnthropicAdapter, OpenAIAdapter])(
  'maps non-streaming network errors and cancellation',
  async (Adapter) => {
    const adapter = new Adapter();
    await adapter.initialize({ apiKey: 'key' });
    fetchMock.mockRejectedValue(new TypeError('network failed'));
    await expect(adapter.generateCompletion(request)).rejects.toMatchObject({
      code: 'networkError',
    });
    const stop = new AbortController();
    stop.abort();
    await expect(
      adapter.generateCompletion({ ...request, signal: stop.signal })
    ).rejects.toMatchObject({ code: 'cancelled' });
  }
);
it.each([
  ['authentication_error', 'authenticationFailed'],
  ['not_found_error', 'modelNotFound'],
  ['rate_limit_error', 'rateLimited'],
  ['timeout_error', 'timeout'],
  ['overloaded_error', 'serverError'],
] as const)('maps Anthropic SSE %s', async (type, code) => {
  fetchMock.mockResolvedValue(
    mockResponse(frame('error', { error: { type } })) as unknown as Awaited<
      ReturnType<typeof expoFetch>
    >
  );
  const adapter = new AnthropicAdapter();
  await adapter.initialize({ apiKey: 'key' });
  await expect(
    collect(adapter.generateStreamingCompletion(request))
  ).rejects.toMatchObject({ code });
});
it.each([
  ['invalid_api_key', 'authenticationFailed'],
  ['model_not_found', 'modelNotFound'],
  ['rate_limit_exceeded', 'rateLimited'],
  ['context_length_exceeded', 'contextTooLong'],
] as const)('maps OpenAI failed response %s', async (code, expected) => {
  fetchMock.mockResolvedValue(
    mockResponse(
      frame('response.failed', {
        response: { status: 'failed', error: { code } },
      })
    ) as unknown as Awaited<ReturnType<typeof expoFetch>>
  );
  const adapter = new OpenAIAdapter();
  await adapter.initialize({ apiKey: 'key' });
  await expect(
    collect(adapter.generateStreamingCompletion(request))
  ).rejects.toMatchObject({ code: expected });
});

it('continues an assistant-ending or system-only Anthropic branch without unsupported prefill', () => {
  const messages = [
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'A prior answer' },
  ] as const;
  const body = anthropicBody({ model: 'claude-opus-5-5', messages }, true);
  expect(body.messages).toEqual([
    ...messages,
    { role: 'user', content: 'Continue from where you left off.' },
  ]);
  expect(messages).toHaveLength(2);
  expect(
    anthropicBody(
      {
        model: 'claude-opus-5-5',
        messages: [{ role: 'system', content: 'Tell a story' }],
      },
      true
    )
  ).toMatchObject({
    system: 'Tell a story',
    messages: [{ role: 'user', content: 'Continue from where you left off.' }],
  });
});
