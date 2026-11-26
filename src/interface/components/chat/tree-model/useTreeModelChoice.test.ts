import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { renderHook } from '@interface/test-support/render-hook';
import { useTreeModelChoice } from './useTreeModelChoice';

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

describe('useTreeModelChoice', () => {
  beforeEach(() => {
    mockApply.mockClear();
  });

  it('choosing the current model changes nothing and resolves saved', async () => {
    const { result, unmount } = renderHook(
      (id: ULID) => useTreeModelChoice(id, 'openrouter'),
      treeId
    );
    await expect(
      result.current.choose('openai/gpt-4o', { id: 'openai/gpt-4o', label: '' })
    ).resolves.toBe(true);
    expect(mockApply).not.toHaveBeenCalled();
    await unmount();
  });

  it('choosing another model saves it', async () => {
    const { result, unmount } = renderHook(
      (id: ULID) => useTreeModelChoice(id, 'openrouter'),
      treeId
    );
    await result.current.choose('anthropic/claude', undefined);
    expect(mockApply).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("only treats the tree's model as chosen on the provider it is on", async () => {
    const { result, unmount } = renderHook(
      (id: ULID) => useTreeModelChoice(id, 'anthropic'),
      treeId
    );
    expect(result.current.currentId).toBeNull();
    await result.current.choose('openai/gpt-4o', undefined);
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith(
      expect.objectContaining({ modelRef: 'anthropic:openai/gpt-4o' })
    );
    await unmount();
  });
});
