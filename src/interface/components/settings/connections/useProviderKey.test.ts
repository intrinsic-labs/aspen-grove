import { expect, describe, it, jest, beforeEach } from '@jest/globals';
import { fetch as expoFetch } from 'expo/fetch';
import type { KeyedProvider } from '@domain/entities';
import { AnthropicAdapter } from '@infrastructure/llm/AnthropicAdapter';
import { OpenAIAdapter } from '@infrastructure/llm/OpenAIAdapter';
import { mockResponse } from '@infrastructure/llm/test-support/direct-provider-fixtures';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useProviderKey } from './useProviderKey';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (effect: () => void) =>
    (require('react') as typeof import('react')).useEffect(effect, [effect]),
}));

const fetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;
const respond = (payload: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    mockResponse(JSON.stringify(payload), { status }) as unknown as Awaited<
      ReturnType<typeof expoFetch>
    >
  );

const stored = new Map<string, string>();
const mockCredentialStore = {
  getProviderApiKey: async (provider: string) => stored.get(provider) ?? null,
  setProviderApiKey: async (provider: string, key: string) => {
    stored.set(provider, key);
  },
  deleteProviderApiKey: async (provider: string) => {
    stored.delete(provider);
  },
};
const mockAnthropic = new AnthropicAdapter();
const mockOpenAI = new OpenAIAdapter();
jest.mock('@interface/composition', () => ({
  useAppServices: () => ({
    adapters: {
      credentialStore: mockCredentialStore,
      providerRegistry: {
        getAnthropicAdapter: () => mockAnthropic,
        getOpenAIAdapter: () => mockOpenAI,
      },
    },
  }),
}));

const MODELS: Record<'anthropic' | 'openai', unknown> = {
  anthropic: {
    data: [
      { id: 'claude-mock', display_name: 'Claude Mock' },
      { id: 'claude-mock-2', display_name: 'Claude Mock 2' },
    ],
    has_more: false,
  },
  openai: { data: [{ id: 'gpt-4.1', created: 1767225600 }] },
};
const COUNT = { anthropic: 2, openai: 1 } as const;

beforeEach(() => {
  fetchMock.mockReset();
  stored.clear();
});

describe.each(['anthropic', 'openai'] as const)(
  'useProviderKey(%s)',
  (provider) => {
    const setup = async () => {
      const hook = renderHook(
        (name: KeyedProvider) => useProviderKey(name),
        provider
      );
      await act(async () => undefined);
      return hook;
    };

    it('reads a stored key and reports it', async () => {
      stored.set(provider, ' sk-stored ');
      const { result, unmount } = await setup();
      expect(result.current.storedKey).toBe('sk-stored');
      expect(result.current.hasStoredKey).toBe(true);
      await unmount();
    });

    it('saves a trimmed key to secure storage at once', async () => {
      const { result, unmount } = await setup();
      expect(result.current.hasStoredKey).toBe(false);
      await act(async () => {
        await result.current.save('  sk-new  ');
      });
      expect(stored.get(provider)).toBe('sk-new');
      expect(result.current.storedKey).toBe('sk-new');
      await unmount();
    });

    it('replaces a stored key', async () => {
      stored.set(provider, 'sk-old');
      const { result, unmount } = await setup();
      await act(async () => {
        await result.current.save('sk-replacement');
      });
      expect(stored.get(provider)).toBe('sk-replacement');
      await unmount();
    });

    it('removes the key when saving an empty field, or with remove()', async () => {
      stored.set(provider, 'sk-old');
      const { result, unmount } = await setup();
      await act(async () => {
        await result.current.save('   ');
      });
      expect(stored.has(provider)).toBe(false);
      expect(result.current.hasStoredKey).toBe(false);

      await act(async () => {
        await result.current.save('sk-again');
      });
      await act(async () => {
        await result.current.remove();
      });
      expect(stored.has(provider)).toBe(false);
      await unmount();
    });

    it('passes the test when the provider lists models, sending the stored key', async () => {
      stored.set(provider, 'sk-good');
      const { result, unmount } = await setup();
      respond(MODELS[provider]);
      await act(async () => {
        await result.current.test();
      });
      expect(result.current.testState).toEqual({
        status: 'ok',
        modelCount: COUNT[provider],
      });
      const headers = (fetchMock.mock.calls[0]?.[1] as { headers: object })
        .headers as Record<string, string>;
      expect(JSON.stringify(headers)).toContain('sk-good');
      await unmount();
    });

    it('fails the test in plain words when the provider refuses the key', async () => {
      stored.set(provider, 'sk-bad');
      const { result, unmount } = await setup();
      respond({ error: { message: 'invalid x-api-key' } }, 401);
      await act(async () => {
        await result.current.test();
      });
      const state = result.current.testState;
      expect(state.status).toBe('failed');
      expect(state.status === 'failed' && state.message).toMatch(
        /didn't accept this key/
      );
      await unmount();
    });

    it('fails the test in plain words when the provider cannot be reached', async () => {
      stored.set(provider, 'sk-good');
      const { result, unmount } = await setup();
      fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
      await act(async () => {
        await result.current.test();
      });
      expect(result.current.testState.status).toBe('failed');
      await unmount();
    });

    it('forgets a test result once the key changes', async () => {
      stored.set(provider, 'sk-good');
      const { result, unmount } = await setup();
      respond(MODELS[provider]);
      await act(async () => {
        await result.current.test();
      });
      expect(result.current.testState.status).toBe('ok');
      await act(async () => {
        await result.current.save('sk-other');
      });
      expect(result.current.testState).toEqual({ status: 'idle' });
      await unmount();
    });
  }
);

describe('useProviderKey(openrouter)', () => {
  it('saves and removes its key without touching a direct adapter', async () => {
    const { result, unmount } = renderHook(
      (name: KeyedProvider) => useProviderKey(name),
      'openrouter'
    );
    await act(async () => undefined);
    await act(async () => {
      await result.current.save('sk-or-1');
    });
    expect(stored.get('openrouter')).toBe('sk-or-1');
    await act(async () => {
      await result.current.remove();
    });
    expect(stored.has('openrouter')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    await unmount();
  });
});
