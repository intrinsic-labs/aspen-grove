import type { ContextMenuAction } from 'react-native-context-menu-view';
import { nativeMenuNests } from './native-menu-platform';

/**
 * One element of a native pull-down menu as SwiftUI builds one: an item that
 * runs a command, or a group of items (an inline section, a ControlGroup or
 * a submenu).
 */
export type MenuTreeNode<Command> = {
  readonly action: ContextMenuAction;
  readonly command?: Command;
  readonly children?: readonly MenuTreeNode<Command>[];
};

/** A `Button` (or `Toggle`, checked while `selected`). */
export const menuItem = <Command>(
  title: string,
  systemIcon: string,
  command: Command,
  selected?: boolean
): MenuTreeNode<Command> => ({
  action: { title, systemIcon, ...(selected ? { selected } : {}) },
  command,
});

/** Items between two `Divider()`s: an untitled inline section. */
export const menuSection = <Command>(
  children: readonly MenuTreeNode<Command>[]
): MenuTreeNode<Command> => ({
  action: { title: '', inlineChildren: true },
  children,
});

/**
 * A `ControlGroup`: its items side by side, icon over title, in a section
 * of their own (UIMenu `preferredElementSize` medium).
 */
export const menuControlGroup = <Command>(
  children: readonly MenuTreeNode<Command>[]
): MenuTreeNode<Command> => ({
  action: { title: '', inlineChildren: true, preferredElementSize: 'medium' },
  children,
});

/** A nested `Menu("Title") { … }`. */
export const submenu = <Command>(
  title: string,
  children: readonly MenuTreeNode<Command>[],
  systemIcon?: string
): MenuTreeNode<Command> => ({
  action: { title, ...(systemIcon ? { systemIcon } : {}) },
  children,
});

/**
 * The tree reshaped for a menu that can't nest (Android): every inline
 * section and ControlGroup gives its items to the level it sits in, and a
 * submenu inside a submenu does the same, so only top-level submenus remain.
 */
const flattenMenuTree = <Command>(
  nodes: readonly MenuTreeNode<Command>[],
  insideSubmenu: boolean
): MenuTreeNode<Command>[] =>
  nodes.flatMap((node) => {
    if (!node.children) {
      return [node];
    }
    if (node.action.inlineChildren || insideSubmenu) {
      return flattenMenuTree(node.children, insideSubmenu);
    }
    return [{ ...node, children: flattenMenuTree(node.children, true) }];
  });

/**
 * The menu as this platform's native module can draw it: as built on iOS,
 * flattened to one level of submenus on Android. Build the actions and look
 * up presses on the same result.
 */
export const menuTreeForPlatform = <Command>(
  nodes: readonly MenuTreeNode<Command>[],
  os?: string
): readonly MenuTreeNode<Command>[] =>
  nativeMenuNests(os) ? nodes : flattenMenuTree(nodes, false);

/** The native menu's actions for `react-native-context-menu-view`. */
export const toContextMenuActions = <Command>(
  nodes: readonly MenuTreeNode<Command>[]
): ContextMenuAction[] =>
  nodes.map((node) =>
    node.children
      ? { ...node.action, actions: toContextMenuActions(node.children) }
      : node.action
  );

/** The command at a pressed item's index path, if any. */
export const commandAt = <Command>(
  nodes: readonly MenuTreeNode<Command>[],
  indexPath: readonly number[]
): Command | undefined => {
  const [head, ...rest] = indexPath;
  const node = head === undefined ? undefined : nodes[head];
  if (!node) {
    return undefined;
  }
  if (rest.length === 0) {
    return node.command;
  }
  return node.children ? commandAt(node.children, rest) : undefined;
};
