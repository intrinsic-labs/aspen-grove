import type { ContextMenuAction } from 'react-native-context-menu-view';

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

/**
 * The native menu's actions. Each group becomes an untitled inline submenu
 * (UIMenu `displayInline`), which iOS draws as its own section with a
 * divider between sections. A single group stays flat.
 */
export const toNativeMenuActions = <Action extends string>(
  sections: NativeMenuSections<Action>
): ContextMenuAction[] => {
  const groups = sections.filter((section) => section.length > 0);
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
 * The item a native menu press picked, from the event's `indexPath`
 * ([group, item] for grouped menus, [item] for a flat one).
 */
export const findNativeMenuItem = <Action extends string>(
  sections: NativeMenuSections<Action>,
  indexPath: readonly number[]
): NativeMenuItem<Action> | undefined => {
  const groups = sections.filter((section) => section.length > 0);
  if (groups.length === 1) {
    return indexPath.length === 1 ? groups[0][indexPath[0]] : undefined;
  }
  if (indexPath.length !== 2) {
    return undefined;
  }
  return groups[indexPath[0]]?.[indexPath[1]];
};
