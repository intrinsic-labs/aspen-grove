import { StyleSheet } from 'react-native';
import { AppText } from '@interface/ui/system';

type SettingsStatusProps = {
  readonly saving: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  readonly hasValidationError: boolean;
};

export const SettingsStatus = ({
  saving,
  notice,
  error,
  hasValidationError,
}: SettingsStatusProps) => {
  return (
    <>
      {saving ? (
        <AppText variant="meta" tone="secondary" style={styles.statusText}>
          Saving changes...
        </AppText>
      ) : null}

      {notice && !hasValidationError ? (
        <AppText variant="meta" tone="secondary" style={styles.statusText}>
          {notice}
        </AppText>
      ) : null}

      {error ? (
        <AppText variant="meta" tone="accent" style={styles.statusText}>
          {error}
        </AppText>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  statusText: {
    marginLeft: 4,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 18,
    fontStyle: 'italic',
  },
});

