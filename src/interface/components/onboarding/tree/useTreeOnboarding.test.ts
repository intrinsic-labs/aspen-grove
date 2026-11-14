import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useTreeOnboarding } from './useTreeOnboarding';

const mockPreferences = {
  get: jest.fn(async () => ({}) as { treeOnboardingCompletedAt?: Date }),
  update: jest.fn(
    async (_changes: { treeOnboardingCompletedAt?: Date }) => ({})
  ),
};

jest.mock('@interface/composition', () => ({
  useAppServices: () => ({
    repositories: { userPreferencesRepo: mockPreferences },
  }),
}));
jest.mock('@interface/hooks/useScreenSettled', () => ({
  useScreenSettled: () => true,
}));

describe('useTreeOnboarding', () => {
  it('shows on a tree until closed, then records it as done', async () => {
    const { result } = renderHook(useTreeOnboarding, undefined);
    await act(() => undefined);
    expect(result.current.visible).toBe(true);

    await act(() => result.current.close());

    expect(result.current.visible).toBe(false);
    expect(mockPreferences.update).toHaveBeenCalledWith({
      treeOnboardingCompletedAt: expect.any(Date),
    });
  });
});
