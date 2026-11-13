import { useMemo } from 'react';
import ContextMenu from 'react-native-context-menu-view';
import type { Tag } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { HeaderIconButton } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import {
  commandAt,
  toContextMenuActions,
} from '@/interface/ui/components/native-menu-tree';
import { buildHomeMenu, type HomeMenuCommand } from './home-menu';

type HomeMenuProps = {
  readonly tags: readonly Tag[];
  readonly activeTagId: ULID | null;
  readonly busy: boolean;
  readonly onCommand: (command: HomeMenuCommand) => void;
};

/**
 * Home's leading toolbar menu (HomeScreenView.swift:124-155): a native
 * pull-down menu on a tap. Its `···` is the plain `ellipsis`, since the
 * toolbar's glass circle already draws the circle.
 */
export const HomeMenu = ({
  tags,
  activeTagId,
  busy,
  onCommand,
}: HomeMenuProps) => {
  const menu = useMemo(
    () => buildHomeMenu(tags, activeTagId),
    [tags, activeTagId]
  );

  return (
    <ContextMenu
      dropdownMenuMode
      actions={toContextMenuActions(menu)}
      onPress={(event) => {
        const command = commandAt(menu, event.nativeEvent.indexPath);
        if (command && !busy) {
          onCommand(command);
        }
      }}
    >
      <HeaderIconButton
        icon={busy ? 'hourglass-outline' : 'ellipsis-horizontal'}
        iconSize={loomUiTokens.header.ellipsisSize}
        accessibilityLabel="Home menu"
        testID="home-menu-button"
      />
    </ContextMenu>
  );
};
