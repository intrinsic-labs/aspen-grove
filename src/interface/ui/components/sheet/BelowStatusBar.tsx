import { useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type BelowStatusBarProps = {
  readonly children: ReactNode;
  /** What shows behind the status bar. Transparent by default. */
  readonly backgroundColor?: string;
};

/**
 * Android has no page sheets: a `PageSheet`'s Modal fills the screen, edge
 * to edge, so its content would sit under the status bar and taps on its
 * own bar would land on the system bar. This keeps it below the status bar
 * and hands its children a top inset of 0, since it has taken that inset:
 * a `FormSheetHeader` inside (`useSheetBarTopInset`) doesn't pad again. On
 * iOS a sheet sits below the status bar, so it adds nothing.
 */
export const BelowStatusBar = ({
  children,
  backgroundColor,
}: BelowStatusBarProps) => {
  const insets = useSafeAreaInsets();
  const consumed = useMemo(() => ({ ...insets, top: 0 }), [insets]);
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }
  return (
    <View style={[styles.fill, { paddingTop: insets.top, backgroundColor }]}>
      <SafeAreaInsetsContext.Provider value={consumed}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
