import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useErrorDetailDisclosure } from './useErrorDetailDisclosure';

describe('useErrorDetailDisclosure', () => {
  it('starts collapsed when Verbose Error Alerts is off, and toggles', async () => {
    const { result } = renderHook<
      boolean,
      ReturnType<typeof useErrorDetailDisclosure>
    >(useErrorDetailDisclosure, false);
    expect(result.current.shown).toBe(false);
    await act(() => result.current.toggle());
    expect(result.current.shown).toBe(true);
    await act(() => result.current.toggle());
    expect(result.current.shown).toBe(false);
  });

  it('starts expanded when Verbose Error Alerts is on, and can be hidden', async () => {
    const { result } = renderHook(useErrorDetailDisclosure, true);
    expect(result.current.shown).toBe(true);
    await act(() => result.current.toggle());
    expect(result.current.shown).toBe(false);
  });

  it('follows the setting once it loads, until the person chooses', async () => {
    const { result, rerender } = renderHook<
      boolean,
      ReturnType<typeof useErrorDetailDisclosure>
    >(useErrorDetailDisclosure, false);
    await rerender(true);
    expect(result.current.shown).toBe(true);
    await act(() => result.current.toggle());
    await rerender(false);
    await rerender(true);
    expect(result.current.shown).toBe(false);
  });
});
