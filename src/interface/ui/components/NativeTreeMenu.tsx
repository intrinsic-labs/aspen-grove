import { useMemo, type ReactNode } from 'react';
import ContextMenu from 'react-native-context-menu-view';
import { pressedIndexPath } from './native-menu-platform';
import {
  commandAt,
  menuTreeForPlatform,
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
 * A native pull-down menu built from a menu tree, shaped for the platform
 * it runs on, that hands back the pressed item's command.
 */
export const NativeTreeMenu = <Command,>({
  menu,
  onCommand,
  children,
}: NativeTreeMenuProps<Command>) => {
  const shown = useMemo(() => menuTreeForPlatform(menu), [menu]);
  const actions = useMemo(() => toContextMenuActions(shown), [shown]);

  return (
    <ContextMenu
      dropdownMenuMode
      actions={actions}
      onPress={(event) => {
        const command = commandAt(shown, pressedIndexPath(event.nativeEvent));
        if (command !== undefined) {
          onCommand(command);
        }
      }}
    >
      {children}
    </ContextMenu>
  );
};
