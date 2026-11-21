import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import {
  findNativeMenuItem,
  toNativeMenuActions,
} from '@/interface/ui/components/native-menu';
import { nativeMenuDismissalProps } from '@/interface/ui/components/native-menu-dismissal';
import type { ChatRow } from '../types';
import {
  buildMessageMenuSections,
  type ChatMessageMenuAction,
} from './message-menu';
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
  const sections = buildMessageMenuSections({
    bookmarked: row.bookmarked,
    pruned: row.pruned,
    continuationCount: row.continuationCount,
    isCurrent,
  });
  const previewArea = usePreviewArea();
  const bounds =
    Platform.OS === 'ios' && previewArea
      ? messagePreviewBounds({ ...previewArea, sections })
      : null;

  return (
    <ContextMenu
      actions={toNativeMenuActions(sections)}
      borderRadius={previewBorderRadius}
      previewBackgroundColor="transparent"
      previewTopInset={bounds?.top}
      previewBottomInset={bounds?.bottom}
      style={style}
      {...nativeMenuDismissalProps}
      onPress={(event) => {
        const menuItem = findNativeMenuItem(sections, event.nativeEvent);
        if (menuItem) {
          onMessageAction(row.id, menuItem.action);
        }
      }}
    >
      {children}
    </ContextMenu>
  );
};
