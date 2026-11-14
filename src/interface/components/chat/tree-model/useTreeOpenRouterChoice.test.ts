import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { renderHook } from '@interface/test-support/render-hook';
import { useTreeOpenRouterChoice } from './useTreeOpenRouterChoice';

const mockApply = jest.fn(async (_changes: unknown) => true);

jest.mock('./useTreeModelAgent', () => ({
  useTreeModelAgent: () => ({
    agent: { configuration: { maxTokens: 999_999 } },
    model: { provider: 'openrouter', id: 'openai/gpt-4o' },
    error: null,
    apply: mockApply,
  }),
}));

const treeId = '01KTREE0000000000000000000' as ULID;

describe('useTreeOpenRouterChoice', () => {
  beforeEach(() => {
    mockApply.mockClear();
  });

  it('choosing the current model changes nothing and resolves saved', async () => {
    const { result, unmount } = renderHook(useTreeOpenRouterChoice, treeId);
    await expect(
      result.current.choose('openai/gpt-4o', { id: 'openai/gpt-4o', label: '' })
    ).resolves.toBe(true);
    expect(mockApply).not.toHaveBeenCalled();
    await unmount();
  });

  it('choosing another model saves it', async () => {
    const { result, unmount } = renderHook(useTreeOpenRouterChoice, treeId);
    await result.current.choose('anthropic/claude', undefined);
    expect(mockApply).toHaveBeenCalledTimes(1);
    await unmount();
  });
});
