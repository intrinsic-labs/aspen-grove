import type { ContextMenuAction } from 'react-native-context-menu-view';
import { pressedIndexPath, type NativeMenuPress } from './native-menu-platform';

/** One item in a native (UIMenu) context or dropdown menu. */
export type NativeMenuItem<Action extends string> = {
  readonly action: Action;
  readonly title: string;
  readonly systemIcon?: string;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
};

/**
 * A menu as SwiftUI writes one: groups of items with a divider between
 * groups (`Divider()` in a `.contextMenu` or `Menu`).
 */
export type NativeMenuSections<Action extends string> =
  readonly (readonly NativeMenuItem<Action>[])[];

const toAction = <Action extends string>(
  item: NativeMenuItem<Action>
): ContextMenuAction => ({
  title: item.title,
  systemIcon: item.systemIcon,
  destructive: item.destructive,
  disabled: item.disabled,
});

/** The groups that have items. */
const visibleGroups = <Action extends string>(
  sections: NativeMenuSections<Action>
): (readonly NativeMenuItem<Action>[])[] =>
  sections.filter((section) => section.length > 0);

/**
 * The native menu's actions. Each group becomes an untitled inline submenu,
 * drawn as its own section with a divider between sections: UIMenu
 * `displayInline` on iOS, a menu group on Android (the patched module). A
 * single group stays flat.
 */
export const toNativeMenuActions = <Action extends string>(
  sections: NativeMenuSections<Action>
): ContextMenuAction[] => {
  const groups = visibleGroups(sections);
  if (groups.length === 1) {
    return groups[0].map(toAction);
  }
  return groups.map((section) => ({
    title: '',
    inlineChildren: true,
    actions: section.map(toAction),
  }));
};

/**
 * The item a native menu press picked, from its index path ([group, item]
 * for grouped menus, [item] for a flat one).
 */
export const findNativeMenuItem = <Action extends string>(
  sections: NativeMenuSections<Action>,
  press: NativeMenuPress
): NativeMenuItem<Action> | undefined => {
  const groups = visibleGroups(sections);
  const indexPath = pressedIndexPath(press);
  if (groups.length === 1) {
    return indexPath.length === 1 ? groups[0][indexPath[0]] : undefined;
  }
  if (indexPath.length !== 2) {
    return undefined;
  }
  return groups[indexPath[0]]?.[indexPath[1]];
};
