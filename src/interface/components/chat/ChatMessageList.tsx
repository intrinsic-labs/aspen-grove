import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  type TextStyle,
  View,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import type { ProviderErrorAction } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useLatestCallback } from '@/interface/hooks/useLatestCallback';
import { useScreenSettled } from '@/interface/hooks/useScreenSettled';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { ChatErrorNotice } from './ChatErrorNotice';
import { MarkdownText } from './MarkdownText';
import { ChatMessageRows } from './message-list/ChatMessageRows';
import type { ContinuationRailState } from './message-list/continuation-rail-state';
import type { ChatMessageMenuAction } from './message-list/message-menu';
import type { SpeakingRow } from './read-aloud/useChatReadAloud';
import type { ChatDisplayPreferences, ChatRow } from './types';

type ChatMessageListProps = {
  readonly loading: boolean;
  readonly sending: boolean;
  readonly rows: readonly ChatRow[];
  readonly streamingAssistantText: string;
  readonly composerHeight: number;
  readonly headerHeight: number;
  readonly error: string | null;
  /** What fixes `error`, when something does (e.g. open Connections). */
  readonly errorAction: ProviderErrorAction;
  readonly onErrorAction: () => void;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly onNodeTap: (nodeId: ULID) => void;
  /** The row being read aloud (Voice Mode), drawn in its voice's color. */
  readonly speakingRow: SpeakingRow | null;
  readonly continuationRail: ContinuationRailState;
  readonly displayPreferences: ChatDisplayPreferences;
};

/**
 * While earlier rows are prepended (tail-first mounting), keep whatever is on
 * screen in place instead of pushing it down. Only then: left on, it fights
 * the animated scrolls and row moves of a continuation rail opening.
 */
const keepVisibleContentInPlace = { minIndexForVisible: 0 } as const;

export const ChatMessageList = memo(
  ({
    loading,
    sending,
    rows,
    streamingAssistantText,
    composerHeight,
    headerHeight,
    error,
    errorAction,
    onErrorAction,
    scrollRef,
    onScroll,
    onMessageAction,
    onNodeTap,
    speakingRow,
    continuationRail,
    displayPreferences,
  }: ChatMessageListProps) => {
    const { colors } = useAspenGroveTheme();
    const settled = useScreenSettled();
    // Earlier rows are still being mounted above the visible ones.
    const [filling, setFilling] = useState(false);
    const scrollMetricsRef = useRef({
      offsetY: 0,
      viewportHeight: 0,
    });
    const rowLayoutsRef = useRef(
      new Map<string, { y: number; height: number }>()
    );
    const railLayoutsRef = useRef(
      new Map<string, { y: number; height: number }>()
    );
    const suppressTapUntilByNodeRef = useRef(new Map<string, number>());
    const revealRailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const activeRailNodeId =
      continuationRail.visible && continuationRail.sourceNodeId
        ? continuationRail.sourceNodeId
        : null;
    const messageTextStyle = useMemo<TextStyle>(
      () => ({
        fontSize: displayPreferences.messageFontSize,
        lineHeight: displayPreferences.messageLineHeight,
        ...(displayPreferences.messageFontFamily
          ? { fontFamily: displayPreferences.messageFontFamily }
          : {}),
      }),
      [
        displayPreferences.messageFontFamily,
        displayPreferences.messageFontSize,
        displayPreferences.messageLineHeight,
      ]
    );
    const streamingTextStyle = useMemo<TextStyle>(
      () => ({
        ...messageTextStyle,
        opacity: loomUiTokens.messageList.messageTextOpacity,
      }),
      [messageTextStyle]
    );

    const revealContinuationRail = useCallback(
      (nodeId: ULID) => {
        const rowLayout = rowLayoutsRef.current.get(nodeId);
        const railLayout = railLayoutsRef.current.get(nodeId);
        const { offsetY, viewportHeight } = scrollMetricsRef.current;
        if (!rowLayout || !railLayout || viewportHeight <= 0) {
          return;
        }

        const railTop = rowLayout.y + railLayout.y;
        const railBottom = railTop + railLayout.height;
        const visibleTop =
          offsetY + headerHeight + loomUiTokens.messageList.topPadding;
        const visibleBottom =
          offsetY +
          viewportHeight -
          composerHeight -
          loomUiTokens.messageList.composerClearancePadding;

        if (railBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, offsetY + railBottom - visibleBottom),
            animated: true,
          });
          return;
        }

        if (railTop < visibleTop) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, railTop - headerHeight),
            animated: true,
          });
        }
      },
      [composerHeight, headerHeight, scrollRef]
    );

    const scheduleRailReveal = useCallback(
      (nodeId: ULID) => {
        if (revealRailTimeoutRef.current) {
          clearTimeout(revealRailTimeoutRef.current);
        }

        requestAnimationFrame(() => {
          revealRailTimeoutRef.current = setTimeout(() => {
            revealContinuationRail(nodeId);
          }, 210);
        });
      },
      [revealContinuationRail]
    );

    useEffect(
      () => () => {
        if (revealRailTimeoutRef.current) {
          clearTimeout(revealRailTimeoutRef.current);
        }
      },
      []
    );

    useEffect(() => {
      if (!activeRailNodeId) {
        return;
      }
      scheduleRailReveal(activeRailNodeId);
    }, [
      activeRailNodeId,
      continuationRail.cards.length,
      continuationRail.loading,
      scheduleRailReveal,
    ]);

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        scrollMetricsRef.current = {
          offsetY: contentOffset.y,
          viewportHeight: layoutMeasurement.height,
        };
        onScroll(event);
      },
      [onScroll]
    );

    const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
      scrollMetricsRef.current = {
        ...scrollMetricsRef.current,
        viewportHeight: event.nativeEvent.layout.height,
      };
    }, []);

    // Rows get stable handlers so a new closure here (on every rail or
    // composer change) doesn't re-render every message.
    const recordRowLayout = useLatestCallback(
      (nodeId: ULID, event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        rowLayoutsRef.current.set(nodeId, { y, height });
        if (activeRailNodeId === nodeId) {
          scheduleRailReveal(nodeId);
        }
      }
    );

    const recordRailLayout = useLatestCallback(
      (nodeId: ULID, event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        railLayoutsRef.current.set(nodeId, { y, height });
        if (activeRailNodeId === nodeId) {
          scheduleRailReveal(nodeId);
        }
      }
    );

    const suppressNextNodeTap = useCallback((nodeId: ULID) => {
      suppressTapUntilByNodeRef.current.set(nodeId, Date.now() + 900);
    }, []);

    const handleNodePress = useLatestCallback((nodeId: ULID) => {
      const suppressUntil = suppressTapUntilByNodeRef.current.get(nodeId);
      if (suppressUntil && suppressUntil > Date.now()) {
        return;
      }
      suppressTapUntilByNodeRef.current.delete(nodeId);
      onNodeTap(nodeId);
    });

    const handleMessageAction = useLatestCallback(onMessageAction);

    if (loading) {
      return (
        <View testID="chat-message-list-loading" style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return (
      <KeyboardAwareScrollView
        testID="chat-message-list"
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
        maintainVisibleContentPosition={
          filling ? keepVisibleContentInPlace : undefined
        }
        onLayout={handleScrollLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ChatMessageRows
          rows={rows}
          settled={settled}
          onFillingChange={setFilling}
          railSourceNodeId={continuationRail.sourceNodeId}
          continuationRail={continuationRail}
          messageTextStyle={messageTextStyle}
          displayPreferences={displayPreferences}
          speakingRow={speakingRow}
          captionIconColor={colors.tertiary}
          captionTextColor={colors.secondaryVariant}
          onPress={handleNodePress}
          onLongPress={suppressNextNodeTap}
          onMessageAction={handleMessageAction}
          onRowLayout={recordRowLayout}
          onRailLayout={recordRailLayout}
        />

        {sending && streamingAssistantText.length > 0 ? (
          <View testID="chat-streaming-message" style={styles.streamingRow}>
            <MarkdownText baseStyle={streamingTextStyle} transient>
              {streamingAssistantText}
            </MarkdownText>
          </View>
        ) : null}

        {error ? (
          <ChatErrorNotice
            message={error}
            action={errorAction}
            onAction={onErrorAction}
          />
        ) : null}

        {sending ? <View style={styles.bottomSpacer} /> : null}
      </KeyboardAwareScrollView>
    );
  }
);

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
  streamingRow: {
    width: '100%',
    alignItems: 'flex-start',
  },
  bottomSpacer: {
    height: loomUiTokens.messageList.sendingBottomSpacer,
  },
});
