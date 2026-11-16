import { describe, expect, it, jest } from '@jest/globals';
import type { IUserPreferencesRepository } from '@application/repositories';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useVerboseErrorAlerts } from './useVerboseErrorAlerts';

// Focus is the screen's; here it runs once on mount.
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    require('react').useEffect(effect, [effect]),
}));

type Repo = Pick<IUserPreferencesRepository, 'get'>;
type Stored = Awaited<ReturnType<Repo['get']>>;

const repoWith = (verboseErrorAlerts: boolean): Repo => ({
  get: () => Promise.resolve({ verboseErrorAlerts } as unknown as Stored),
});

describe('useVerboseErrorAlerts', () => {
  it('is off until the preference is read', async () => {
    const { result } = renderHook(useVerboseErrorAlerts, repoWith(true));
    expect(result.current).toBe(false);
    await act(() => Promise.resolve());
    expect(result.current).toBe(true);
  });

  it('reads off when the setting is off', async () => {
    const { result } = renderHook(useVerboseErrorAlerts, repoWith(false));
    await act(() => Promise.resolve());
    expect(result.current).toBe(false);
  });

  it('stays off when the preference cannot be read', async () => {
    const failing: Repo = { get: () => Promise.reject(new Error('locked')) };
    const { result } = renderHook(useVerboseErrorAlerts, failing);
    await act(() => Promise.resolve());
    expect(result.current).toBe(false);
  });
});
