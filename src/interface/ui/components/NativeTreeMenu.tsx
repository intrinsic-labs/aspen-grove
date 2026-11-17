import { useMemo, type ReactNode } from 'react';
import ContextMenu from 'react-native-context-menu-view';
import { pressedIndexPath } from './native-menu-platform';
import {
  commandAt,
  toContextMenuActions,
  type MenuTreeNode,
} from './native-menu-tree';

type NativeTreeMenuProps<Command> = {
  readonly menu: readonly MenuTreeNode<Command>[];
  readonly onCommand: (command: Command) => void;
  /** The button that opens the menu on a tap. */
  readonly children: ReactNode;
};

/**
 * A native pull-down menu built from a menu tree that hands back the
 * pressed item's command. Both platforms draw the same tree: Android's
 * patched module turns inline sections into divided groups and a submenu
 * inside a submenu into a section.
 */
export const NativeTreeMenu = <Command,>({
  menu,
  onCommand,
  children,
}: NativeTreeMenuProps<Command>) => {
  const actions = useMemo(() => toContextMenuActions(menu), [menu]);

  return (
    <ContextMenu
      dropdownMenuMode
      actions={actions}
      onPress={(event) => {
        const command = commandAt(menu, pressedIndexPath(event.nativeEvent));
        if (command !== undefined) {
          onCommand(command);
        }
      }}
    >
      {children}
    </ContextMenu>
  );
};
