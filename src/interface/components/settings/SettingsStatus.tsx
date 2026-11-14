import { StyleSheet, Text } from 'react-native';
import { formText } from '@/interface/ui/components/form';

type SettingsStatusProps = {
  readonly saving: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  readonly hasValidationError: boolean;
};

/**
 * Autosave status under a settings Form, in the footer's caption style.
 * Latent Spaces saves through `@AppStorage` with no status at all; Aspen
 * Grove keeps a quiet line so a failed save is never silent.
 */
export const SettingsStatus = ({
  saving,
  notice,
  error,
  hasValidationError,
}: SettingsStatusProps) => (
  <>
    {saving ? (
      <Text
        testID="settings-status-saving"
        style={[formText.footer, styles.status]}
      >
        Saving changes…
      </Text>
    ) : null}

    {notice && !hasValidationError ? (
      <Text
        testID="settings-status-notice"
        style={[formText.footer, styles.status]}
      >
        {notice}
      </Text>
    ) : null}

    {error ? (
      <Text
        testID="settings-status-error"
        style={[formText.footer, styles.status, styles.error]}
      >
        {error}
      </Text>
    ) : null}
  </>
);

const styles = StyleSheet.create({
  status: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  error: {
    // systemRed, dark
    color: '#FF453A',
  },
});
