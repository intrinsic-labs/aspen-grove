import { useMemo } from 'react';
import ContextMenu from 'react-native-context-menu-view';
import {
  commandAt,
  toContextMenuActions,
} from '@/interface/ui/components/native-menu-tree';
import { HeaderIconButton } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import {
  buildTreeMenu,
  type TreeMenuBookmark,
  type TreeMenuCommand,
} from './tree-menu';

type TreeToolbarMenuProps = {
  /** Checked in the menu while Voice Mode is on. */
  readonly voiceModeEnabled: boolean;
  readonly bookmarks: readonly TreeMenuBookmark[];
  readonly onCommand: (command: TreeMenuCommand) => void;
};

/**
 * The tree's trailing toolbar menu, `slider.horizontal.3`
 * (ToolbarMenu.swift): a native pull-down menu on a tap.
 */
export const TreeToolbarMenu = ({
  voiceModeEnabled,
  bookmarks,
  onCommand,
}: TreeToolbarMenuProps) => {
  const menu = useMemo(
    () => buildTreeMenu({ voiceModeEnabled, bookmarks }),
    [bookmarks, voiceModeEnabled]
  );

  return (
    <ContextMenu
      dropdownMenuMode
      actions={toContextMenuActions(menu)}
      onPress={(event) => {
        const command = commandAt(menu, event.nativeEvent.indexPath);
        if (command) {
          onCommand(command);
        }
      }}
    >
      {/* Latent Spaces' `slider.horizontal.3`. */}
      <HeaderIconButton
        icon="options-outline"
        iconSize={loomUiTokens.header.menuIconSize}
        accessibilityLabel="Tree menu"
        testID="chat-menu-button"
      />
    </ContextMenu>
  );
};
