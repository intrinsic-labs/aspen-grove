import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@interface/test-support/render-hook';
import { useDiscardGuard } from './useDiscardGuard';

const setup = (hasUnsavedChanges: boolean) => {
  const close = jest.fn();
  const confirm = jest.fn<(discard: () => void) => void>();
  const { result } = renderHook(
    (dirty: boolean) => useDiscardGuard(dirty, close, confirm),
    hasUnsavedChanges
  );
  return { close, confirm, request: () => result.current() };
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
});
