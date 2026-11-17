import { describe, expect, it, jest } from '@jest/globals';
import type { ScrollView } from 'react-native';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useOpenOnPage } from './useOpenOnPage';

type Props = { visible: boolean; pageWidth: number };

const setup = (initial: Props, page = 1) => {
  const scrollTo = jest.fn();
  const pagerRef = { current: { scrollTo } as unknown as ScrollView };
  const hook = renderHook(
    ({ visible, pageWidth }: Props) =>
      useOpenOnPage(pagerRef, visible, pageWidth, page),
    initial
  );
  return { hook, scrollTo };
};

describe('useOpenOnPage', () => {
  it('waits for the pages to be laid out before scrolling (Android clamps)', async () => {
    const { hook, scrollTo } = setup({ visible: true, pageWidth: 0 });
    await hook.rerender({ visible: true, pageWidth: 400 });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(() => hook.result.current(400)); // one page laid out so far
    expect(scrollTo).not.toHaveBeenCalled();
    await act(() => hook.result.current(1200));
    expect(scrollTo).toHaveBeenCalledWith({ x: 400, animated: false });
  });

  it('scrolls once per opening, and on reopening with the pages in place', async () => {
    const { hook, scrollTo } = setup({ visible: true, pageWidth: 400 });
    await act(() => hook.result.current(1200));
    await act(() => hook.result.current(1200));
    expect(scrollTo).toHaveBeenCalledTimes(1);

    await hook.rerender({ visible: false, pageWidth: 400 });
    await hook.rerender({ visible: true, pageWidth: 400 });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("reaches the last page with Android's fractional layout widths", async () => {
    const pageWidth = 392.7272644042969;
    const { hook, scrollTo } = setup({ visible: true, pageWidth }, 2);
    await act(() => hook.result.current(1178.1817626953125));
    expect(scrollTo).toHaveBeenCalledWith({
      x: 2 * pageWidth,
      animated: false,
    });
  });
});
