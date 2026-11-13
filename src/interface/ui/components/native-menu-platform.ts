import { Platform } from 'react-native';

/**
 * What `react-native-context-menu-view` reports for a press. iOS always
 * sends the item's full `indexPath`. Android sends `indexPath` only for an
 * item inside a submenu (`[parent, item]`); a top-level item comes with
 * `index` alone.
 */
export type NativeMenuPress = {
  readonly index: number;
  readonly indexPath?: readonly number[];
};

/** The pressed item's index path, on either platform. */
export const pressedIndexPath = (press: NativeMenuPress): readonly number[] =>
  press.indexPath ?? [press.index];

/**
 * Whether the native menu draws inline sections and submenus inside
 * submenus. iOS (UIMenu) does. Android's module draws neither: one level of
 * submenus under the top level, and an inline section would show as a
 * submenu with an empty title.
 */
export const nativeMenuNests = (os: string = Platform.OS): boolean =>
  os === 'ios';
