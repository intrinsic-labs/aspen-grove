import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import type { SetupStatus } from '@application/services/onboarding';
import { AppPillButton, AppText } from '@/interface/ui/value-objects';
import { setupHintCopy } from './setup-hint-copy';

type SetupHintProps = {
  readonly status: SetupStatus;
  /** testIDs: `<prefix>-setup-hint` (line) and `<prefix>-setup-action`. */
  readonly testIDPrefix: string;
  readonly style?: ViewStyle;
};

/**
 * One line saying what to do before a tree can start, with the action right
 * under it. Renders nothing when the user is ready.
 */
export const SetupHint = ({ status, testIDPrefix, style }: SetupHintProps) => {
  const router = useRouter();
  const copy = setupHintCopy(status);
  if (!copy) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <AppText
        testID={`${testIDPrefix}-setup-hint`}
        variant="meta"
        tone="secondary"
        style={styles.message}
      >
        {copy.message}
      </AppText>
      <AppPillButton
        testID={`${testIDPrefix}-setup-action`}
        label={copy.actionLabel}
        variant="outline"
        onPress={() => router.push(copy.href)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
  },
  message: {
    textAlign: 'center',
  },
});
