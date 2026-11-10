import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import type { ChatRow } from '../types';
import {
  buildMessageMenuItems,
  type ChatMessageMenuAction,
} from './message-menu';

/** The message row's native long-press menu around its content. */
export const MessageContextMenu = ({
  row,
  onMessageAction,
  children,
  previewBorderRadius,
  style,
}: {
  readonly row: ChatRow;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly children: ReactNode;
  readonly previewBorderRadius: number;
  readonly style: StyleProp<ViewStyle>;
}) => {
  const menuItems = buildMessageMenuItems(
    row.bookmarked,
    row.pruned,
    row.authorType
  );
  const actions: ContextMenuAction[] = menuItems.map((item) => ({
    title: item.title,
    systemIcon: item.systemIcon,
    destructive: item.destructive,
  }));

  return (
    <ContextMenu
      title={row.localId}
      actions={actions}
      borderRadius={previewBorderRadius}
      previewBackgroundColor="transparent"
      style={style}
      onPress={(event) => {
        const menuItem = menuItems[event.nativeEvent.index];
        if (menuItem) {
          onMessageAction(row.id, menuItem.action);
        }
      }}
    >
      {children}
    </ContextMenu>
  );
};
