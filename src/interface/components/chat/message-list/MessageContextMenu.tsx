import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import {
  commandAt,
  toContextMenuActions,
} from '@/interface/ui/components/native-menu-tree';
import { pressedIndexPath } from '@/interface/ui/components/native-menu-platform';
import { nativeMenuDismissalProps } from '@/interface/ui/components/native-menu-dismissal';
import type { ChatRow } from '../types';
import { buildMessageMenu, type ChatMessageMenuAction } from './message-menu';
import { messagePreviewBounds } from './message-preview-bounds';
import { usePreviewArea } from './preview-area-context';

/**
 * The message row's native long-press menu around its content. Untitled,
 * as in Latent Spaces (NodeView.swift `.contextMenu`). On iOS the lifted
 * preview stays below the tree's header with room for the menu under it,
 * showing the message's top, cropped, when it is taller than that.
 */
export const MessageContextMenu = ({
  row,
  isCurrent,
  onMessageAction,
  children,
  previewBorderRadius,
  style,
}: {
  readonly row: ChatRow;
  readonly isCurrent: boolean;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly children: ReactNode;
  readonly previewBorderRadius: number;
  readonly style: StyleProp<ViewStyle>;
}) => {
  const menu = buildMessageMenu({
    bookmarked: row.bookmarked,
    pruned: row.pruned,
    continuationCount: row.continuationCount,
    isCurrent,
  });
  const previewArea = usePreviewArea();
  const bounds =
    Platform.OS === 'ios' && previewArea
      ? messagePreviewBounds({
          ...previewArea,
          sections: menu.map((group) => group.children ?? []),
        })
      : null;

  return (
    <ContextMenu
      actions={toContextMenuActions(menu)}
      borderRadius={previewBorderRadius}
      previewBackgroundColor="transparent"
      previewTopInset={bounds?.top}
      previewBottomInset={bounds?.bottom}
      style={style}
      {...nativeMenuDismissalProps}
      onPress={(event) => {
        const command = commandAt(menu, pressedIndexPath(event.nativeEvent));
        if (command !== undefined) {
          onMessageAction(row.id, command);
        }
      }}
    >
      {children}
    </ContextMenu>
  );
};
