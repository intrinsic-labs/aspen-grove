import { renderHook } from '@interface/test-support/render-hook';
import { useKeyboardAccessoryId } from './useKeyboardAccessoryId';

describe('useKeyboardAccessoryId', () => {
  it('keeps its ID while the fields stay shown', async () => {
    const { result, rerender } = renderHook(
      (shown: boolean) => useKeyboardAccessoryId('editor', shown),
      true as boolean
    );
    const first = result.current;
    await rerender(true);
    expect(result.current).toBe(first);
    expect(first.startsWith('editor-')).toBe(true);
  });

  it('issues a new ID each time the fields are shown again', async () => {
    const { result, rerender } = renderHook(
      (shown: boolean) => useKeyboardAccessoryId('editor', shown),
      true as boolean
    );
    const first = result.current;
    await rerender(false);
    await rerender(true);
    expect(result.current).not.toBe(first);
  });

  it('issues a new ID for each mount', () => {
    const a = renderHook(() => useKeyboardAccessoryId('editor'), undefined);
    const b = renderHook(() => useKeyboardAccessoryId('editor'), undefined);
    expect(a.result.current).not.toBe(b.result.current);
  });
});
