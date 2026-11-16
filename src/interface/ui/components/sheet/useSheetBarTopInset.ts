import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * How far a sheet's own top bar (`FormSheetHeader`) moves down for the
 * status bar. On iOS a sheet sits below the status bar: none. On Android a
 * sheet, or a modal stack screen, fills the screen, so the bar takes the top
 * inset, unless a `BelowStatusBar` above it (a `PageSheet`) has already
 * taken it and passed down 0. A native stack header handles its own inset.
 */
export const useSheetBarTopInset = (): number => {
  const { top } = useSafeAreaInsets();
  return Platform.OS === 'android' ? top : 0;
};
