import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '@/interface/ui/value-objects';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import type { BufferRecovery } from './buffer-document-session';

const { control } = bufferTokens;

type BufferDocumentNoticeProps = {
  readonly error: string | null;
  readonly recovery: BufferRecovery | null;
  readonly onDismissRecovery: () => void;
};

/** Quiet inline text above the pill: a failed save, or an unsaved draft to copy. */
export const BufferDocumentNotice = ({
  error,
  recovery,
  onDismissRecovery,
}: BufferDocumentNoticeProps) => {
  if (!error && !recovery) return null;
  return (
    <View style={styles.notice}>
      {error ? (
        <AppText
          testID="buffer-commit-error"
          variant="mono"
          tone="secondary"
          style={styles.text}
        >
          {error}
        </AppText>
      ) : null}
      {recovery ? (
        <>
          <AppText
            testID="buffer-recovery"
            variant="mono"
            tone="secondary"
            style={styles.text}
          >
            Unsaved text from an earlier session
          </AppText>
          <View style={styles.row}>
            <Pressable
              testID="buffer-recovery-copy"
              hitSlop={control.hitSlop}
              onPress={() => void Clipboard.setStringAsync(recovery.text)}
            >
              <AppText variant="mono" style={styles.text}>
                Copy unsaved text
              </AppText>
            </Pressable>
            <Pressable
              testID="buffer-recovery-discard"
              hitSlop={control.hitSlop}
              onPress={onDismissRecovery}
            >
              <AppText variant="mono" tone="secondary" style={styles.text}>
                Discard
              </AppText>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: bufferTokens.bar.topGap,
  },
  row: { flexDirection: 'row', gap: control.height / 2 },
  text: { fontSize: control.labelSize },
});
