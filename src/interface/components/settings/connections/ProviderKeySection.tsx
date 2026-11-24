import { Linking, StyleSheet, Text } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import {
  FormButtonRow,
  FormSection,
  formText,
} from '@/interface/ui/components/form';
import type { ProviderKeyConfig } from './provider-key-config';
import { keyStatusText, type KeyTestState } from './provider-key-status';

type ProviderKeySectionProps = {
  readonly config: ProviderKeyConfig;
  readonly hasStoredKey: boolean;
  readonly test: KeyTestState;
  /** A failed save or read of the key, shown in place of the status. */
  readonly error: string | null;
  readonly onEditKey: () => void;
  readonly onTestKey: () => void;
};

/**
 * One hosted provider's section of API Keys (APIKeySettingsView.swift:
 * 85-104): edit the key in a sheet, plus links out to the provider's site.
 * Where the provider has an authenticated call, a Test Key row checks the
 * stored key. The footer says whether a key is stored and how a test went,
 * which Latent Spaces does not show. Rows: `connections-<provider>-edit`,
 * `-test`, `-link-docs|keys|credits`; footer `-status`.
 */
export const ProviderKeySection = ({
  config,
  hasStoredKey,
  test,
  error,
  onEditKey,
  onTestKey,
}: ProviderKeySectionProps) => {
  const id = `connections-${config.provider}`;
  return (
    <FormSection
      testID={id}
      header={config.name}
      footer={
        <Text
          testID={`${id}-status`}
          style={[
            formText.footer,
            error || test.status === 'failed' ? styles.failed : null,
          ]}
        >
          {error ?? keyStatusText(config, hasStoredKey, test)}
        </Text>
      }
    >
      {/* rectangle.and.pencil.and.ellipsis.rtl */}
      <FormButtonRow
        testID={`${id}-edit`}
        title={`Edit ${config.name} API Key`}
        icon="create-outline"
        onPress={onEditKey}
      />
      {config.canTest && hasStoredKey ? (
        <FormButtonRow
          testID={`${id}-test`}
          title={test.status === 'failed' ? 'Test Again' : 'Test Key'}
          icon="checkmark-circle-outline"
          disabled={test.status === 'checking'}
          onPress={onTestKey}
        />
      ) : null}
      {config.links.map((link) => (
        <FormButtonRow
          key={link.suffix}
          testID={`${id}-link-${link.suffix}`}
          title={link.title}
          icon={link.icon}
          onPress={() => void Linking.openURL(link.url)}
        />
      ))}
    </FormSection>
  );
};

const styles = StyleSheet.create({
  failed: {
    color: loomUiTokens.colors.destructive,
  },
});
