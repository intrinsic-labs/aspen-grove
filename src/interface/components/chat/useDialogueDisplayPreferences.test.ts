import { fonts } from '@interface/ui/value-objects/fonts';
import type { IUserPreferencesRepository } from '@application/repositories';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useDialogueDisplayPreferences } from './useDialogueDisplayPreferences';

// Focus is the screen's; here it runs once on mount.
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    require('react').useEffect(effect, [effect]),
}));

type Repo = Pick<IUserPreferencesRepository, 'get'>;
type StoredPreferences = Awaited<ReturnType<Repo['get']>>;

const stored = {
  fontSize: 16,
  nodeViewStyle: 'filled',
  nodeViewCornerRadius: 8,
} as unknown as StoredPreferences;

const deferredRepo = () => {
  let settle: (outcome: 'resolve' | 'reject') => void = () => {};
  const repo: Repo = {
    get: () =>
      new Promise<StoredPreferences>((resolve, reject) => {
        settle = (outcome) =>
          outcome === 'resolve'
            ? resolve(stored)
            : reject(new Error('unreadable'));
      }),
  };
  return { repo, settle: (outcome: 'resolve' | 'reject') => settle(outcome) };
};

describe('useDialogueDisplayPreferences', () => {
  it('is not loaded, with defaults, until the saved preferences are read', async () => {
    const { repo, settle } = deferredRepo();
    const { result } = renderHook(useDialogueDisplayPreferences, {
      userPreferencesRepo: repo,
    });
    await act(() => undefined);

    expect(result.current.loaded).toBe(false);
    expect(result.current.preferences.messageFontSize).toBe(18);

    await act(() => settle('resolve'));

    expect(result.current.loaded).toBe(true);
    // Cardo renders over the saved size (see toMessageType).
    expect(result.current.preferences.messageFontSize).toBe(17);
    expect(result.current.preferences.messageLineHeight).toBeCloseTo(22.98, 2);
  });

  it('counts as loaded with the defaults when the read fails', async () => {
    const { repo, settle } = deferredRepo();
    const { result } = renderHook(useDialogueDisplayPreferences, {
      userPreferencesRepo: repo,
    });
    await act(() => undefined);

    await act(() => settle('reject'));

    expect(result.current.loaded).toBe(true);
    expect(result.current.preferences.messageFontSize).toBe(18);
  });
});

it.each([
  ['IBM\u0050lexMono-Regular', fonts.mono, 16, 21.632],
  [fonts.vt220, fonts.vt220, 18, 27],
])(
  'loads stored font %s with its message metrics',
  async (storedFace, family, size, lineHeight) => {
    const repo: Repo = {
      get: async () => ({ ...stored, fontFace: storedFace }),
    };
    const { result } = renderHook(useDialogueDisplayPreferences, {
      userPreferencesRepo: repo,
    });
    await act(() => undefined);
    expect(result.current.preferences.messageFontFamily).toBe(family);
    expect(result.current.preferences.messageFontSize).toBe(size);
    expect(result.current.preferences.messageLineHeight).toBeCloseTo(
      lineHeight
    );
  }
);
