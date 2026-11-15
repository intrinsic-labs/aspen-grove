import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@interface/test-support/render-hook';
import { useDiscardGuard } from './useDiscardGuard';

const setup = (hasUnsavedChanges: boolean) => {
  const calls: string[] = [];
  const close = jest.fn(() => calls.push('close'));
  const discard = jest.fn(() => calls.push('discard'));
  const confirm = jest.fn<(discard: () => void) => void>();
  const { result } = renderHook(
    (dirty: boolean) => useDiscardGuard(dirty, close, discard, confirm),
    hasUnsavedChanges
  );
  return { calls, close, discard, confirm, request: () => result.current() };
};

describe('useDiscardGuard', () => {
  it('closes a sheet with nothing unsaved at once', () => {
    const { close, confirm, request } = setup(false);
    request();
    expect(close).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before dropping unsaved edits, and closes only on Discard', () => {
    const { close, confirm, request } = setup(true);
    request();
    expect(close).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mock.calls[0]![0]();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('drops the edits on Discard, so the sheet reopens without them', () => {
    const { calls, confirm, request } = setup(true);
    request();
    confirm.mock.calls[0]![0]();
    expect(calls).toEqual(['discard', 'close']);
  });

  it('keeps the edits when nothing was discarded', () => {
    const { discard, confirm, request } = setup(true);
    request();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(discard).not.toHaveBeenCalled();
  });

  it('closes a clean sheet without discarding anything', () => {
    const { calls, request } = setup(false);
    request();
    expect(calls).toEqual(['close']);
  });
});
