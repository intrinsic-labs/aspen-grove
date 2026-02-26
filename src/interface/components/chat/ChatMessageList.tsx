import { memo, type RefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { AppText } from '@interface/ui/system';
import type { ChatRow } from './types';

type ChatMessageListProps = {
  readonly loading: boolean;
  readonly sending: boolean;
  readonly rows: readonly ChatRow[];
  readonly streamingAssistantText: string;
  readonly composerHeight: number;
  readonly error: string | null;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
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
        bottomOffset={8}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(16, composerHeight + 12),
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
          <View
            key={row.id}
            style={[
              styles.row,
              row.authorType === 'human' ? styles.userRow : styles.assistantRow,
            ]}
          >
            <AppText variant="meta" tone="muted" style={styles.authorText}>
              {row.authorType === 'human' ? 'YOU' : 'ASSISTANT'}
            </AppText>

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
          </View>
        ))}

        {streamingAssistantText.length > 0 ? (
          <View style={[styles.row, styles.assistantRow]}>
            <AppText variant="meta" tone="muted" style={styles.authorText}>
              ASSISTANT
            </AppText>
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
    paddingHorizontal: 18,
    paddingTop: 18,
    flexGrow: 1,
    gap: 18,
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
  authorText: {
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userBubble: {
    maxWidth: '88%',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 27,
  },
  errorText: {
    marginTop: 8,
  },
  bottomSpacer: {
    height: 2,
  },
});
