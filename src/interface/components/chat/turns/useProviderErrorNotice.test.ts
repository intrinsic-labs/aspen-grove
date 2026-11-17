import type { IUserPreferencesRepository } from '@application/repositories';
import { LlmProviderError } from '@application/services/llm';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useProviderErrorNotice } from './useProviderErrorNotice';

// Focus is the screen's; here it runs once on mount.
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    require('react').useEffect(effect, [effect]),
}));

type Repo = Pick<IUserPreferencesRepository, 'get'>;
type StoredPreferences = Awaited<ReturnType<Repo['get']>>;

const repoWithEndpoint = (endpoint: string): Repo => ({
  get: async () =>
    ({
      lmstudioSettings: {
        endpoint,
        autoLoadModels: true,
        idleTtlSeconds: 0,
      },
    }) as unknown as StoredPreferences,
});

const unreadableRepo: Repo = {
  get: () => Promise.reject(new Error('unreadable')),
};

const unreachable = () =>
  new LlmProviderError({
    code: 'networkError',
    message: 'LM Studio streaming error: Network request failed',
    provider: 'lmstudio',
    retryable: true,
  });

const renderNotice = (userPreferencesRepo: Repo) => {
  const shown: (string | null)[] = [];
  const rendered = renderHook(useProviderErrorNotice, {
    error: null as string | null,
    setError: (error: string | null) => {
      shown.push(error);
    },
    userPreferencesRepo,
  });
  return { ...rendered, shown };
};

describe('useProviderErrorNotice', () => {
  it('names the saved LM Studio address when LM Studio is not answering', async () => {
    const { result, shown } = renderNotice(
      repoWithEndpoint('http://192.168.1.20:1234')
    );
    await act(() => undefined);

    await act(() =>
      result.current.showProviderError(unreachable(), 'lmstudio')
    );

    expect(shown).toEqual([
      "LM Studio isn't answering at this address:\nhttp://192.168.1.20:1234\nStart its local server, then try again.",
    ]);
  });

  it('keeps the phone hint for a localhost address', async () => {
    const { result, shown } = renderNotice(
      repoWithEndpoint('http://localhost:1235')
    );
    await act(() => undefined);

    await act(() =>
      result.current.showProviderError(unreachable(), 'lmstudio')
    );

    expect(shown[0]).toMatch(
      /^LM Studio isn't answering at this address:\nhttp:\/\/localhost:1235\n.*network address instead of localhost\.$/
    );
  });

  it('still shows the plain message when the address cannot be read', async () => {
    const { result, shown } = renderNotice(unreadableRepo);
    await act(() => undefined);

    await act(() =>
      result.current.showProviderError(unreachable(), 'lmstudio')
    );

    expect(shown).toEqual([
      "LM Studio isn't answering. Start its local server, then try again.",
    ]);
  });

  it('keeps the action and detail with the message it described', async () => {
    const { result, rerender, shown } = renderNotice(
      repoWithEndpoint('http://192.168.1.20:1234')
    );
    await act(() => undefined);
    await act(() =>
      result.current.showProviderError(unreachable(), 'lmstudio')
    );

    await rerender({
      error: shown[0] ?? null,
      setError: () => undefined,
      userPreferencesRepo: repoWithEndpoint('http://192.168.1.20:1234'),
    });

    expect(result.current.errorAction).toBe('open-connections');
    expect(result.current.errorDetail).toBe(
      '[lmstudio:networkError] LM Studio streaming error: Network request failed'
    );
  });
});
