import { memo, type RefObject } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
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
  readonly error: string | null;
  readonly scrollRef: RefObject<KeyboardAwareScrollViewRef | null>;
  readonly colors: {
    readonly primary: string;
    readonly surface: string;
  };
};

export const ChatMessageList = memo(
  ({ loading, sending, rows, error, scrollRef, colors }: ChatMessageListProps) => {
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
        extraKeyboardSpace={0}
        bottomOffset={0}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        alwaysBounceVertical
        overScrollMode="always"
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
    paddingBottom: 16,
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

