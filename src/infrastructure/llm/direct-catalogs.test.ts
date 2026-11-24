import { fetch as expoFetch } from 'expo/fetch';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { normalizeAnthropicModel } from './anthropic/catalog-normalize';
import { normalizeOpenAIModel } from './openai/catalog-normalize';
import { mockResponse } from './test-support/direct-provider-fixtures';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
const fetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;
const respond = (payload: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    mockResponse(JSON.stringify(payload), { status }) as unknown as Awaited<
      ReturnType<typeof expoFetch>
    >
  );
beforeEach(() => fetchMock.mockReset());

it('normalizes Anthropic names, timestamps and limits without inventing prices', () => {
  expect(
    normalizeAnthropicModel({
      id: 'claude-example',
      display_name: 'Claude Example',
      created_at: '2026-01-01T00:00:00Z',
      max_input_tokens: 200000,
      max_tokens: 64000,
    })
  ).toEqual({
    id: 'claude-example',
    displayName: 'Claude Example',
    created: 1767225600,
    contextLength: 200000,
    maxCompletionTokens: 64000,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: ['max_tokens', 'stop'],
  });
  expect(normalizeAnthropicModel(null)).toBeNull();
  expect(normalizeAnthropicModel({ id: '' })).toBeNull();
  expect(
    normalizeAnthropicModel({ id: 'retired', lifecycle: 'retired' })
  ).toBeNull();
  expect(
    normalizeAnthropicModel({ id: 'x', created_at: 'bad', max_tokens: 0 })
      ?.maxCompletionTokens
  ).toBeUndefined();
});

it('follows every Anthropic model page with authenticated headers and sorts/deduplicates', async () => {
  respond({
    data: [{ id: 'z', display_name: 'Zed' }],
    has_more: true,
    last_id: 'z',
  });
  respond({
    data: [{ id: 'a' }, { id: 'z', display_name: 'Zed' }],
    has_more: false,
  });
  const adapter = new AnthropicAdapter();
  await adapter.initialize({ apiKey: 'key' });
  expect((await adapter.fetchModels()).map((model) => model.id)).toEqual([
    'a',
    'z',
  ]);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    'https://api.anthropic.com/v1/models?limit=1000',
    'https://api.anthropic.com/v1/models?limit=1000&after_id=z',
  ]);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    method: 'GET',
    headers: { 'x-api-key': 'key', 'anthropic-version': '2026-10-21' },
  });
  expect(adapter.getCapabilities().supportedModels).toEqual(['a', 'z']);
  await adapter.initialize({ apiKey: 'other-key' });
  expect(adapter.getCachedModels()).toEqual([]);
});

it('rejects broken pagination rather than looping', async () => {
  respond({ data: [{ id: 'a' }], has_more: true });
  const adapter = new AnthropicAdapter();
  await adapter.initialize({ apiKey: 'key' });
  await expect(adapter.fetchModels()).rejects.toMatchObject({
    code: 'networkError',
  });
});

it.each([
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-5',
  'gpt-6.2-astra',
  'o3-mini',
  'o4-mini',
  'ft:gpt-4.1:org:suffix:id',
])('normalizes Responses text model %s', (id) => {
  expect(normalizeOpenAIModel({ id, created: 123 })).toMatchObject({
    id,
    displayName: id,
    created: 123,
    inputModalities: ['text'],
    outputModalities: ['text'],
  });
});
it.each([
  'text-embedding-3-small',
  'whisper-1',
  'tts-1',
  'dall-e-3',
  'gpt-image-1',
  'gpt-4o-audio-preview',
  'gpt-4o-realtime-preview',
  'gpt-4o-mini-transcribe',
  'gpt-4o-mini-tts',
  'gpt-4o-search-preview',
  'o3-deep-research',
  'o1-preview',
  'o1-mini',
  'o1-pro',
  'o3-pro',
  'chatgpt-4o-latest',
  'gpt-5-chat-latest',
  'gpt-3.5-turbo-instruct',
  'unknown',
])('filters non-Responses text model %s', (id) => {
  expect(normalizeOpenAIModel({ id })).toBeNull();
});

it('fetches the OpenAI list with bearer auth, filtering specialized models', async () => {
  respond({
    data: [
      { id: 'gpt-6.2-astra' },
      { id: 'text-embedding-3-small' },
      { id: 'gpt-4.1' },
    ],
  });
  const adapter = new OpenAIAdapter();
  await adapter.initialize({ apiKey: 'key' });
  expect((await adapter.fetchModels()).map((model) => model.id)).toEqual([
    'gpt-4.1',
    'gpt-6.2-astra',
  ]);
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    method: 'GET',
    headers: { Authorization: 'Bearer key' },
  });
});

it.each([AnthropicAdapter, OpenAIAdapter])(
  'maps catalog errors through the adapter error types',
  async (Adapter) => {
    const adapter = new Adapter();
    await adapter.initialize({ apiKey: 'key' });
    respond({ error: { message: 'bad key' } }, 401);
    await expect(adapter.fetchModels()).rejects.toMatchObject({
      code: 'authenticationFailed',
      retryable: false,
    });
  }
);
