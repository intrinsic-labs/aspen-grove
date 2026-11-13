import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import {
  findNativeMenuItem,
  toNativeMenuActions,
} from '@/interface/ui/components/native-menu';
import type { ChatRow } from '../types';
import {
  buildMessageMenuSections,
  type ChatMessageMenuAction,
} from './message-menu';

/**
 * The message row's native long-press menu around its content. Untitled,
 * as in Latent Spaces (NodeView.swift `.contextMenu`).
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

  return (
    <ContextMenu
      actions={toNativeMenuActions(sections)}
      borderRadius={previewBorderRadius}
      previewBackgroundColor="transparent"
      style={style}
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
