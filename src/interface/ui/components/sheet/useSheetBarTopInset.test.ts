import { describe, expect, it, jest } from '@jest/globals';
import { createElement, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { act } from '@interface/test-support/render-hook';
import { BelowStatusBar } from './BelowStatusBar';
import { useSheetBarTopInset } from './useSheetBarTopInset';

const TestRenderer: {
  create: (element: unknown) => unknown;
} = require('react-test-renderer');

const WINDOW_INSETS = { top: 48, bottom: 24, left: 0, right: 0 };

/** The bar's top inset, rendered under the window's insets. */
const barTopInset = async (wrap: (bar: ReactNode) => ReactNode) => {
  let measured: number | undefined;
  const Bar = () => {
    measured = useSheetBarTopInset();
    return null;
  };
  await act(() => {
    TestRenderer.create(
      createElement(
        SafeAreaInsetsContext.Provider,
        { value: WINDOW_INSETS },
        wrap(createElement(Bar))
      )
    );
  });
  return measured;
};

const asIs = (bar: ReactNode) => bar;
const inPageSheet = (bar: ReactNode) =>
  createElement(BelowStatusBar, null, bar);

describe('useSheetBarTopInset', () => {
  it('adds nothing on iOS, where a sheet sits below the status bar', async () => {
    expect(await barTopInset(asIs)).toBe(0);
    expect(await barTopInset(inPageSheet)).toBe(0);
  });

  it('takes the status bar on Android, in a full-screen modal screen', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      expect(await barTopInset(asIs)).toBe(48);
    } finally {
      platform.restore();
    }
  });

  it('takes nothing on Android once a page sheet has taken the inset', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      expect(await barTopInset(inPageSheet)).toBe(0);
    } finally {
      platform.restore();
    }
  });
});
