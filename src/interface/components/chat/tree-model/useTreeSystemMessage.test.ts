import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useTreeSystemMessage } from './useTreeSystemMessage';

const treeId = '01KTREE0000000000000000000' as ULID;

type Update = (input: {
  id: ULID;
  changes: { systemContext: string };
}) => Promise<unknown>;

const mockTreeRepo = {
  findById: jest.fn(async () => ({ id: treeId, systemContext: '' })),
  update: jest.fn<Update>(),
};

jest.mock('@interface/composition', () => ({
  useAppServices: () => ({ repositories: { treeRepo: mockTreeRepo } }),
}));

const writes = () =>
  mockTreeRepo.update.mock.calls.map(([input]) => input.changes.systemContext);

describe('useTreeSystemMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockTreeRepo.update.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('tries a failed write again when the page is left', async () => {
    mockTreeRepo.update
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue({});
    const { result, unmount } = renderHook(useTreeSystemMessage, treeId);
    await act(() => undefined);

    await act(() => result.current.onChangeText('Be terse.'));
    await act(() => jest.advanceTimersByTime(450));
    expect(writes()).toEqual(['Be terse.']);
    expect(result.current.error).toBe('disk full');

    await unmount();

    expect(writes()).toEqual(['Be terse.', 'Be terse.']);
  });

  it('writes saved text once, even when the page is left mid-write', async () => {
    let finish: () => void = () => {};
    mockTreeRepo.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({});
        })
    );
    const { result, unmount } = renderHook(useTreeSystemMessage, treeId);
    await act(() => undefined);

    await act(() => result.current.onChangeText('Be terse.'));
    await act(() => jest.advanceTimersByTime(450));
    await unmount();
    await act(() => finish());

    expect(writes()).toEqual(['Be terse.']);
  });
});
