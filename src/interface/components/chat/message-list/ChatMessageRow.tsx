import { memo, useMemo } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  type TextStyle,
  View,
} from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  StretchInY,
  StretchOutY,
} from 'react-native-reanimated';
import type { ULID } from '@domain/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { ContinuationRail } from '../ContinuationRail';
import { MarkdownText } from '../MarkdownText';
import type { ChatDisplayPreferences, ChatRow } from '../types';
import { sameChatRow } from './chat-row-equality';
import type { ContinuationRailState } from './continuation-rail-state';
import type { ChatMessageMenuAction } from './message-menu';
import { MessageContextMenu } from './MessageContextMenu';
import { NodeCaption } from './NodeCaption';
import { SystemMessage } from './SystemMessage';
import { UserBubble } from './UserBubble';

const railLayoutTransition = LinearTransition.duration(180).easing(
  Easing.out(Easing.cubic)
);
const railEntering = StretchInY.duration(180).easing(Easing.out(Easing.cubic));
const railExiting = StretchOutY.duration(150).easing(Easing.in(Easing.cubic));

export type ChatMessageRowProps = {
  readonly row: ChatRow;
  /** The open rail, passed only to the row it hangs under. */
  readonly rail: ContinuationRailState | null;
  readonly messageTextStyle: TextStyle;
  readonly displayPreferences: ChatDisplayPreferences;
  /** Voice Mode: the row being read takes the voice's color. */
  readonly speakingColor?: string;
  readonly captionIconColor: string;
  readonly captionTextColor: string;
  readonly onPress: (nodeId: ULID) => void;
  readonly onLongPress: (nodeId: ULID) => void;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly onRowLayout: (nodeId: ULID, event: LayoutChangeEvent) => void;
  readonly onRailLayout: (nodeId: ULID, event: LayoutChangeEvent) => void;
};

/**
 * One message on the active path, with its caption and, when open, the
 * continuation rail under it. Memoized on the row's fields, so opening a
 * rail, reloading the path or typing in the composer re-renders only the
 * rows that changed. Callbacks must be stable (see `useLatestCallback`).
 */
const ChatMessageRowView = ({
  row,
  rail,
  messageTextStyle,
  displayPreferences,
  speakingColor,
  captionIconColor,
  captionTextColor,
  onPress,
  onLongPress,
  onMessageAction,
  onRowLayout,
  onRailLayout,
}: ChatMessageRowProps) => {
  const isHuman = row.authorType === 'human';
  const isSystem = row.authorType === 'system';
  const layout = isSystem
    ? systemLayout
    : isHuman
      ? userLayout
      : assistantLayout;
  const markdownStyle = useMemo<TextStyle>(
    () =>
      speakingColor
        ? { ...messageTextStyle, color: speakingColor }
        : {
            ...messageTextStyle,
            opacity: loomUiTokens.messageList.messageTextOpacity,
          },
    [messageTextStyle, speakingColor]
  );

  return (
    <View
      style={styles.rowBlock}
      onLayout={(event) => onRowLayout(row.id, event)}
    >
      <View
        style={[styles.row, layout.row, row.pruned ? styles.prunedRow : null]}
      >
        <MessageContextMenu
          row={row}
          onMessageAction={onMessageAction}
          previewBorderRadius={
            isHuman ? displayPreferences.userNodeCornerRadius : 0
          }
          style={layout.menuHost}
        >
          <Pressable
            testID={`chat-message-row-${row.id}`}
            onPress={() => onPress(row.id)}
            onLongPress={() => onLongPress(row.id)}
            style={layout.target}
          >
            {isSystem ? (
              <SystemMessage
                text={row.text}
                messageTextStyle={messageTextStyle}
                speakingColor={speakingColor}
              />
            ) : isHuman ? (
              <UserBubble
                text={row.text}
                cornerRadius={displayPreferences.userNodeCornerRadius}
                viewStyle={displayPreferences.userNodeViewStyle}
                messageTextStyle={messageTextStyle}
                speakingColor={speakingColor}
              />
            ) : (
              <MarkdownText baseStyle={markdownStyle}>{row.text}</MarkdownText>
            )}
          </Pressable>
        </MessageContextMenu>
        <NodeCaption
          row={row}
          iconColor={captionIconColor}
          textColor={captionTextColor}
        />
      </View>

      {rail ? (
        <Animated.View
          collapsable={false}
          entering={railEntering}
          exiting={railExiting}
          layout={railLayoutTransition}
          style={styles.inlineRail}
          onLayout={(event) => onRailLayout(row.id, event)}
        >
          <ContinuationRail
            visible={rail.visible}
            loading={rail.loading}
            sourceLocalId={rail.sourceLocalId}
            cards={rail.cards}
            generation={rail.generation}
            previewFontFamily={displayPreferences.messageFontFamily}
            error={rail.error}
            onSelect={rail.onSelect}
            onMenuAction={rail.onMenuAction}
            onStopSlot={rail.onStopSlot}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const sameRowProps = (
  previous: ChatMessageRowProps,
  next: ChatMessageRowProps
): boolean =>
  sameChatRow(previous.row, next.row) &&
  previous.rail === next.rail &&
  previous.messageTextStyle === next.messageTextStyle &&
  previous.displayPreferences === next.displayPreferences &&
  previous.speakingColor === next.speakingColor &&
  previous.captionIconColor === next.captionIconColor &&
  previous.captionTextColor === next.captionTextColor &&
  previous.onPress === next.onPress &&
  previous.onLongPress === next.onLongPress &&
  previous.onMessageAction === next.onMessageAction &&
  previous.onRowLayout === next.onRowLayout &&
  previous.onRailLayout === next.onRailLayout;

export const ChatMessageRow = memo(ChatMessageRowView, sameRowProps);

const styles = StyleSheet.create({
  rowBlock: {
    width: '100%',
  },
  row: {
    width: '100%',
  },
  // A clear spacer keeps user text off the leading side (NodeView.swift:58).
  userRow: {
    alignItems: 'flex-end',
    paddingLeft: loomUiTokens.messageList.userRowLeadingInset,
  },
  assistantRow: {
    alignItems: 'flex-start',
    paddingRight: loomUiTokens.messageList.modelRowTrailingInset,
  },
  prunedRow: {
    opacity: 0.45,
  },
  userMenuHost: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  assistantMenuHost: {
    alignSelf: 'stretch',
  },
  // Model text is inset by its row padding (CodeBlockView.swift:36).
  assistantMessageTarget: {
    width: '100%',
    padding: loomUiTokens.messageList.messagePadding,
  },
  // A system node: centered, no spacer on either side (NodeView.swift:42-43,
  // 62-67,111-113), text inset `.padding(8)` (NodeView.swift:197).
  systemRow: {
    alignItems: 'center',
  },
  systemMenuHost: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  systemMessageTarget: {
    padding: loomUiTokens.messageList.messagePadding,
  },
  inlineRail: {
    // The rail manages its own horizontal insets; cancel the list's padding
    // so it spans the full width like the prototype's inline band.
    marginHorizontal: -loomUiTokens.messageList.rowInset,
    marginTop: loomUiTokens.messageList.rowGap / 2,
  },
});

const userLayout = {
  row: styles.userRow,
  menuHost: styles.userMenuHost,
  target: null,
};
const assistantLayout = {
  row: styles.assistantRow,
  menuHost: styles.assistantMenuHost,
  target: styles.assistantMessageTarget,
};
const systemLayout = {
  row: styles.systemRow,
  menuHost: styles.systemMenuHost,
  target: styles.systemMessageTarget,
};
