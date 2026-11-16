import { memo, type RefObject, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
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
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { ChatErrorNotice } from './ChatErrorNotice';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ChatMessageRows } from './message-list/ChatMessageRows';
import { StreamingMessage } from './message-list/StreamingMessage';
import {
  keyboardExtraSpace,
  messageListBottomPadding,
} from './message-list/list-insets';
import type { ContinuationRailState } from './message-list/continuation-rail-state';
import type { ChatMessageMenuAction } from './message-list/message-menu';
import { useContinuationRailReveal } from './message-list/useContinuationRailReveal';
import { useKeepBottomOnComposerGrowth } from './message-list/useKeepBottomOnComposerGrowth';
import { useListScrollMetrics } from './message-list/useListScrollMetrics';
import { useMessageTextStyles } from './message-list/useMessageTextStyles';
import { useSuppressedNodeTap } from './message-list/useSuppressedNodeTap';
import type { SpeakingRow } from './read-aloud/useChatReadAloud';
import type { ChatDisplayPreferences, ChatRow } from './types';

type ChatMessageListProps = {
  readonly loading: boolean;
  readonly sending: boolean;
  readonly rows: readonly ChatRow[];
  readonly streamingAssistantText: string;
  readonly composerHeight: number;
  readonly headerHeight: number;
  /** Bottom safe area, which the keyboard covers when it is up. */
  readonly bottomInset: number;
  readonly error: string | null;
  /** What fixes `error`, when something does (e.g. open Connections). */
  readonly errorAction: ProviderErrorAction;
  /** The failure's technical form, offered behind "Details" on the notice. */
  readonly errorDetail?: string;
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
    bottomInset,
    error,
    errorAction,
    errorDetail,
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
    const { messageTextStyle, streamingTextStyle } =
      useMessageTextStyles(displayPreferences);
    const {
      scrollMetricsRef,
      atBottomRef,
      handleScroll,
      handleContentSizeChange,
      handleScrollLayout,
    } = useListScrollMetrics(onScroll);
    const { recordRowLayout, recordRailLayout } = useContinuationRailReveal({
      continuationRail,
      headerHeight,
      composerHeight,
      scrollRef,
      scrollMetricsRef,
    });
    useKeepBottomOnComposerGrowth({
      composerHeight,
      scrollRef,
      scrollMetricsRef,
      atBottomRef,
    });
    const { suppressNextNodeTap, handleNodePress } =
      useSuppressedNodeTap(onNodeTap);
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
        extraKeyboardSpace={keyboardExtraSpace(bottomInset)}
        bottomOffset={loomUiTokens.messageList.bottomOffset}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + loomUiTokens.messageList.topPadding,
            paddingBottom: messageListBottomPadding(composerHeight),
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
        onContentSizeChange={handleContentSizeChange}
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
          <StreamingMessage
            text={streamingAssistantText}
            textStyle={streamingTextStyle}
          />
        ) : null}

        {error ? (
          <ChatErrorNotice
            key={error}
            message={error}
            action={errorAction}
            detail={errorDetail}
            onAction={onErrorAction}
          />
        ) : null}

        {/* Latent Spaces: shown from the request's start until the stream ends
            (LoomTreeContentView.swift:62-70), below any streamed text. */}
        {sending ? <ThinkingIndicator /> : null}
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
    paddingHorizontal: loomUiTokens.messageList.rowInset,
    flexGrow: 1,
    gap: loomUiTokens.messageList.rowGap,
  },
});
