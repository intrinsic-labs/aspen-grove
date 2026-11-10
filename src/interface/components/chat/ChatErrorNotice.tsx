import { Pressable, StyleSheet, View } from 'react-native';
import type { ProviderErrorAction } from '@application/services/llm';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { AppText } from '@/interface/ui/value-objects';

const ACTION_LABELS: Record<NonNullable<ProviderErrorAction>, string> = {
  'open-connections': 'Open Connections',
};

type ChatErrorNoticeProps = {
  readonly message: string;
  readonly action: ProviderErrorAction;
  readonly onAction: () => void;
};

/** The dialogue's error line, with the fix right under it when there is one. */
export const ChatErrorNotice = ({
  message,
  action,
  onAction,
}: ChatErrorNoticeProps) => (
  <View style={styles.container}>
    <AppText testID="chat-error" variant="meta" tone="accent">
      {message}
    </AppText>
    {action ? (
      <Pressable
        testID="chat-error-action"
        onPress={onAction}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => [styles.action, { opacity: pressed ? 0.65 : 1 }]}
      >
        <AppText variant="meta" tone="primary" style={styles.actionLabel}>
          {ACTION_LABELS[action]}
        </AppText>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: loomUiTokens.messageList.errorTopMargin,
    gap: 8,
  },
  action: {
    alignSelf: 'flex-start',
  },
  actionLabel: {
    textDecorationLine: 'underline',
  },
});
