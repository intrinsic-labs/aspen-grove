/**
 * What `react-native-context-menu-view` reports for a press: the item's
 * index within its own menu and its full index path. Both platforms send the
 * path (Android through `patches/react-native-context-menu-view+1.21.0.patch`);
 * `index` alone stands for a top-level item.
 */
export type NativeMenuPress = {
  readonly index: number;
  readonly indexPath?: readonly number[];
};

/** The pressed item's index path. */
export const pressedIndexPath = (press: NativeMenuPress): readonly number[] =>
  press.indexPath ?? [press.index];
