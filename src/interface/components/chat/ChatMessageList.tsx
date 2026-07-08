import {
  memo,
  type ReactNode,
  type RefObject,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type NativeSyntheticEvent as NSE,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextLayoutEventData,
  View,
} from 'react-native';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  LinearTransition,
  StretchInY,
  StretchOutY,
} from 'react-native-reanimated';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import {
  ContinuationRail,
  type ContinuationMenuAction,
} from './ContinuationRail';
import { MarkdownText } from './MarkdownText';
import type {
  ChatDisplayPreferences,
  ChatRow,
  ContinuationPreview,
} from './types';

export type ChatMessageMenuAction =
  | 'regenerate'
  | 'continuations'
  | 'edit'
  | 'rewind'
  | 'copy'
  | 'info'
  | 'bookmark'
  | 'prune';

export type ContinuationRailState = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly sourceNodeId: ULID | null;
  readonly sourceLocalId?: string;
  readonly items: readonly ContinuationPreview[];
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (
    nodeId: ULID,
    action: ContinuationMenuAction
  ) => void;
};

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
  readonly headerHeight: number;
  readonly error: string | null;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly onNodeTap: (nodeId: ULID) => void;
  readonly continuationRail: ContinuationRailState;
  readonly displayPreferences: ChatDisplayPreferences;
};

const railLayoutTransition = LinearTransition.duration(180).easing(
  Easing.out(Easing.cubic)
);
const railEntering = StretchInY.duration(180).easing(
  Easing.out(Easing.cubic)
);
const railExiting = StretchOutY.duration(150).easing(Easing.in(Easing.cubic));

export const ChatMessageList = memo(
  ({
    loading,
    sending,
    rows,
    streamingAssistantText,
    composerHeight,
    headerHeight,
    error,
    scrollRef,
    onScroll,
    onMessageAction,
    onNodeTap,
    continuationRail,
    displayPreferences,
  }: ChatMessageListProps) => {
    const { colors } = useAspenGroveTheme();
    const messageTextStyle = {
      fontSize: displayPreferences.messageFontSize,
      lineHeight: displayPreferences.messageLineHeight,
      ...(displayPreferences.messageFontFamily
        ? {
            fontFamily: displayPreferences.messageFontFamily,
          }
        : {}),
    };

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
            paddingTop: headerHeight + loomUiTokens.messageList.topPadding,
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
          <Animated.View
            key={row.id}
            layout={railLayoutTransition}
            style={styles.rowBlock}
          >
            <ContextMenuWrapper row={row} onMessageAction={onMessageAction}>
              <Pressable
                onPress={() => onNodeTap(row.id)}
                style={[
                  styles.row,
                  row.authorType === 'human'
                    ? styles.userRow
                    : styles.assistantRow,
                  row.pruned ? styles.prunedRow : null,
                ]}
              >
                {row.authorType === 'human' ? (
                  <UserBubble
                    text={row.text}
                    cornerRadius={displayPreferences.userNodeCornerRadius}
                    viewStyle={displayPreferences.userNodeViewStyle}
                    messageTextStyle={messageTextStyle}
                  />
                ) : (
                  <MarkdownText
                    baseStyle={{
                      ...messageTextStyle,
                      opacity: loomUiTokens.messageList.messageTextOpacity,
                    }}
                  >
                    {row.text}
                  </MarkdownText>
                )}
                <NodeCaption
                  row={row}
                  iconColor={colors.tertiary}
                  textColor={colors.secondaryVariant}
                />
              </Pressable>
            </ContextMenuWrapper>

            {continuationRail.sourceNodeId === row.id ? (
              <Animated.View
                collapsable={false}
                entering={railEntering}
                exiting={railExiting}
                layout={railLayoutTransition}
                style={styles.inlineRail}
              >
                <ContinuationRail
                  visible={continuationRail.visible}
                  loading={continuationRail.loading}
                  sourceLocalId={continuationRail.sourceLocalId}
                  continuations={continuationRail.items}
                  error={continuationRail.error}
                  onSelect={continuationRail.onSelect}
                  onMenuAction={continuationRail.onMenuAction}
                />
              </Animated.View>
            ) : null}
          </Animated.View>
        ))}

        {sending && streamingAssistantText.length > 0 ? (
          <View style={[styles.row, styles.assistantRow]}>
            <MarkdownText
              baseStyle={{
                ...messageTextStyle,
                opacity: loomUiTokens.messageList.messageTextOpacity,
              }}
            >
              {streamingAssistantText}
            </MarkdownText>
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

/**
 * Inline affordance line under a node: a filled bookmark glyph (when
 * bookmarked), branch count, and pruned indicator. Rendered only when there is
 * something to say.
 */
const NodeCaption = ({
  row,
  iconColor,
  textColor,
}: {
  readonly row: ChatRow;
  readonly iconColor: string;
  readonly textColor: string;
}) => {
  const parts = [
    row.continuationCount > 1 ? `Continuations: ${row.continuationCount}` : null,
    row.pruned ? 'Pruned' : null,
  ].filter(Boolean);

  if (parts.length === 0 && !row.bookmarked) {
    return null;
  }

  return (
    <View style={styles.nodeCaption}>
      {row.bookmarked ? (
        <Ionicons name="bookmark" size={11} color={iconColor} />
      ) : null}
      {parts.length > 0 ? (
        <Text style={[styles.nodeCaptionText, { color: textColor }]}>
          {parts.join('  ·  ')}
        </Text>
      ) : null}
    </View>
  );
};

const buildMessageMenuItems = (
  bookmarked: boolean,
  pruned: boolean,
  authorType: ChatRow['authorType']
): readonly ChatMessageMenuItem[] =>
  [
    // Regenerate only makes sense on model rows ("replace this response
    // with a new sibling"). On user rows it read as "regenerate the reply
    // to this", which both confused the target and triggered an iOS
    // context-menu dismissal artifact when the rows below the still-mounted
    // pressed row reflowed mid-animation.
    ...(authorType === 'model'
      ? [
          {
            action: 'regenerate',
            title: 'Regenerate',
            systemIcon: 'arrow.clockwise',
          } as const,
        ]
      : []),
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
    {
      action: 'prune',
      title: pruned ? 'Restore' : 'Prune',
      systemIcon: pruned ? 'arrow.uturn.backward.circle' : 'scissors',
      destructive: !pruned,
    },
  ] as const;

type UserBubbleProps = {
  readonly text: string;
  readonly cornerRadius: number;
  readonly viewStyle: 'filled' | 'outlined';
  readonly messageTextStyle: object;
};

const UserBubble = memo(
  ({ text, cornerRadius, viewStyle, messageTextStyle }: UserBubbleProps) => {
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

    // Re-measure from scratch whenever the text or style changes — a width
    // measured under one style is invalid under the other (see below).
    useEffect(() => {
      setMeasuredWidth(null);
    }, [text, viewStyle]);

    const onTextLayout = useCallback(
      (event: NSE<TextLayoutEventData>) => {
        const { lines } = event.nativeEvent;
        if (lines.length === 0) return;

        // Find the maximum line width
        const maxLineWidth = Math.max(...lines.map((line) => line.width));

        // RN draws borders INSIDE the box width, so the outlined style must
        // budget for them or the text's content box comes up 2×border too
        // narrow, re-wraps, re-measures smaller, and the bubble collapses in
        // a feedback loop. Ceil to avoid fractional-width boundary re-wraps.
        const borderAllowance =
          viewStyle === 'outlined'
            ? loomUiTokens.messageList.userBubbleOutlineWidth * 2
            : 0;
        const bubbleWidth = Math.ceil(
          maxLineWidth +
            loomUiTokens.messageList.userBubblePaddingHorizontal * 2 +
            borderAllowance
        );

        // Ignore sub-pixel remeasurements so no styling change can ever
        // re-open the measure → re-wrap → measure oscillation.
        setMeasuredWidth((current) =>
          current !== null && Math.abs(current - bubbleWidth) <= 1
            ? current
            : bubbleWidth
        );
      },
      [viewStyle]
    );

    return (
      <View style={styles.userBubbleWrapper}>
        <View
          style={[
            styles.userBubble,
            {
              borderRadius: cornerRadius,
              // Apply measured width if available
              ...(measuredWidth !== null && { width: measuredWidth }),
            },
            viewStyle === 'filled'
              ? {
                  backgroundColor: loomUiTokens.colors.userBubbleFill,
                  borderWidth: 0,
                }
              : {
                  backgroundColor: 'transparent',
                  borderColor: loomUiTokens.colors.userBubbleOutline,
                  borderWidth: loomUiTokens.messageList.userBubbleOutlineWidth,
                },
          ]}
        >
          <AppText
            variant="body"
            tone={viewStyle === 'filled' ? 'inverse' : 'primary'}
            onTextLayout={onTextLayout}
            style={[
              styles.messageText,
              messageTextStyle,
              viewStyle === 'filled'
                ? styles.userFilledText
                : styles.standardText,
            ]}
          >
            {text}
          </AppText>
        </View>
      </View>
    );
  }
);

const ContextMenuWrapper = ({
  row,
  onMessageAction,
  children,
}: {
  readonly row: ChatRow;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly children: ReactNode;
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
    flexGrow: 1,
    gap: loomUiTokens.messageList.rowGap,
  },
  rowBlock: {
    width: '100%',
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
  prunedRow: {
    opacity: 0.45,
  },
  nodeCaption: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeCaptionText: {
    fontStyle: 'italic',
    fontSize: 11,
    letterSpacing: 0,
  },
  inlineRail: {
    // The rail manages its own horizontal insets; cancel the list's padding
    // so it spans the full width like the prototype's inline band.
    marginHorizontal: -loomUiTokens.layout.horizontalInset,
    marginTop: loomUiTokens.messageList.rowGap / 2,
  },
  userBubbleWrapper: {
    maxWidth: loomUiTokens.messageList.userBubbleMaxWidthPercent,
    alignItems: 'flex-end',
  },
  userBubble: {
    alignSelf: 'flex-end',
    paddingHorizontal: loomUiTokens.messageList.userBubblePaddingHorizontal,
    paddingVertical: loomUiTokens.messageList.userBubblePaddingVertical,
  },
  standardText: {
    opacity: loomUiTokens.messageList.messageTextOpacity,
  },
  userFilledText: {
    color: loomUiTokens.colors.userBubbleFillText,
    opacity: loomUiTokens.messageList.messageTextOpacity,
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
