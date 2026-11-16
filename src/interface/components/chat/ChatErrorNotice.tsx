import { Pressable, StyleSheet, View } from 'react-native';
import type { ProviderErrorAction } from '@application/services/llm';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { AppText } from '@/interface/ui/value-objects';
import {
  useErrorDetailDisclosure,
  useErrorDetailsExpandedByDefault,
} from '../error-details';

const ACTION_LABELS: Record<NonNullable<ProviderErrorAction>, string> = {
  'open-connections': 'Open Connections',
};

type ChatErrorNoticeProps = {
  readonly message: string;
  readonly action: ProviderErrorAction;
  readonly onAction: () => void;
  /** The technical form of the failure; offered behind "Details" if given. */
  readonly detail?: string;
};

/**
 * The dialogue's error line, with the fix right under it when there is one.
 * The provider's own words stay behind a "Details" toggle, as Latent Spaces
 * keeps them out of its alert unless asked for; with Verbose Error Alerts
 * on they show from the start.
 */
export const ChatErrorNotice = ({
  message,
  action,
  onAction,
  detail,
}: ChatErrorNoticeProps) => {
  const { shown: showDetail, toggle } = useErrorDetailDisclosure(
    useErrorDetailsExpandedByDefault()
  );
  return (
    <View style={styles.container}>
      <AppText testID="chat-error" variant="meta" tone="accent">
        {message}
      </AppText>
      {detail && showDetail ? (
        <AppText
          testID="chat-error-detail"
          variant="meta"
          tone="secondary"
          selectable
        >
          {detail}
        </AppText>
      ) : null}
      {detail ? (
        <Pressable
          testID="chat-error-details-toggle"
          onPress={toggle}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <AppText variant="meta" tone="secondary" style={styles.actionLabel}>
            {showDetail ? 'Hide details' : 'Details'}
          </AppText>
        </Pressable>
      ) : null}
      {action ? (
        <Pressable
          testID="chat-error-action"
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <AppText variant="meta" tone="primary" style={styles.actionLabel}>
            {ACTION_LABELS[action]}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

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
