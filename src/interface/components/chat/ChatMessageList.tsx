import { memo, type ReactNode, type RefObject } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { AppText } from '@interface/ui/system';
import { loomUiTokens } from './loom-ui-tokens';
import type { ChatRow } from './types';

export type ChatMessageMenuAction =
  | 'regenerate'
  | 'continuations'
  | 'edit'
  | 'rewind'
  | 'copy'
  | 'info'
  | 'bookmark';

type ChatMessageMenuItem = {
  readonly action: ChatMessageMenuAction;
  readonly title: string;
  readonly systemIcon?: string;
  readonly destructive?: boolean;
};

type ChatMessageListProps = {
  readonly loading: boolean;
  readonly sending: boolean;
  readonly rows: readonly ChatRow[];
  readonly streamingAssistantText: string;
  readonly composerHeight: number;
  readonly error: string | null;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  readonly onMessageAction: (nodeId: string, action: ChatMessageMenuAction) => void;
  readonly colors: {
    readonly primary: string;
    readonly surface: string;
  };
};

export const ChatMessageList = memo(
  ({
    loading,
    sending,
    rows,
    streamingAssistantText,
    composerHeight,
    error,
    scrollRef,
    onScroll,
    onMessageAction,
    colors,
  }: ChatMessageListProps) => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return (
      <KeyboardAwareScrollView
        ref={scrollRef}
        enabled
        extraKeyboardSpace={composerHeight}
        bottomOffset={loomUiTokens.messageList.bottomOffset}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(
              loomUiTokens.messageList.minBottomPadding,
              composerHeight + loomUiTokens.messageList.composerClearancePadding
            ),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        alwaysBounceVertical
        overScrollMode="always"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {rows.map((row) => (
          <ContextMenuWrapper
            key={row.id}
            row={row}
            onMessageAction={onMessageAction}
          >
            <Pressable
              style={[
                styles.row,
                row.authorType === 'human' ? styles.userRow : styles.assistantRow,
              ]}
            >
              {row.authorType === 'human' ? (
                <View
                  style={[
                    styles.userBubble,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <AppText variant="body" tone="inverse" style={styles.messageText}>
                    {row.text}
                  </AppText>
                </View>
              ) : (
                <AppText variant="body" tone="primary" style={styles.messageText}>
                  {row.text}
                </AppText>
              )}
            </Pressable>
          </ContextMenuWrapper>
        ))}

        {streamingAssistantText.length > 0 ? (
          <View style={[styles.row, styles.assistantRow]}>
            <AppText variant="body" tone="primary" style={styles.messageText}>
              {streamingAssistantText}
            </AppText>
          </View>
        ) : null}

        {error ? (
          <AppText variant="meta" tone="accent" style={styles.errorText}>
            {error}
          </AppText>
        ) : null}

        {sending ? <View style={styles.bottomSpacer} /> : null}
      </KeyboardAwareScrollView>
    );
  }
);

const buildMessageMenuItems = (bookmarked: boolean): readonly ChatMessageMenuItem[] =>
  [
    {
      action: 'regenerate',
      title: 'Regenerate Response',
      systemIcon: 'arrow.clockwise',
    },
    {
      action: 'continuations',
      title: 'Continuations',
      systemIcon: 'point.topleft.down.curvedto.point.bottomright.up',
    },
    {
      action: 'edit',
      title: 'Edit',
      systemIcon: 'pencil',
    },
    {
      action: 'rewind',
      title: 'Rewind To Node',
      systemIcon: 'backward.end.alt',
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'info',
      title: 'Node Info',
      systemIcon: 'info.circle',
    },
    {
      action: 'bookmark',
      title: bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: bookmarked ? 'bookmark.slash' : 'bookmark',
    },
  ] as const;

const ContextMenuWrapper = ({
  row,
  onMessageAction,
  children,
}: {
  readonly row: ChatRow;
  readonly onMessageAction: (nodeId: string, action: ChatMessageMenuAction) => void;
  readonly children: ReactNode;
}) => {
  const menuItems = buildMessageMenuItems(row.bookmarked);
  const actions: ContextMenuAction[] = menuItems.map((item) => ({
    title: item.title,
    systemIcon: item.systemIcon,
    destructive: item.destructive,
  }));

  return (
    <ContextMenu
      title={row.localId}
      actions={actions}
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

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingTop: loomUiTokens.messageList.topPadding,
    flexGrow: 1,
    gap: loomUiTokens.messageList.rowGap,
  },
  row: {
    width: '100%',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: loomUiTokens.messageList.userBubbleMaxWidthPercent,
    borderRadius: loomUiTokens.messageList.userBubbleRadius,
    paddingHorizontal: loomUiTokens.messageList.userBubblePaddingHorizontal,
    paddingVertical: loomUiTokens.messageList.userBubblePaddingVertical,
  },
  messageText: {
    fontSize: loomUiTokens.messageList.textSize,
    lineHeight: loomUiTokens.messageList.textLineHeight,
  },
  errorText: {
    marginTop: loomUiTokens.messageList.errorTopMargin,
  },
  bottomSpacer: {
    height: loomUiTokens.messageList.sendingBottomSpacer,
  },
});
