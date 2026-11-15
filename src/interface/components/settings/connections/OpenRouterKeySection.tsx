import { Linking } from 'react-native';
import { FormButtonRow, FormSection } from '@/interface/ui/components/form';

const OPENROUTER_LINKS = [
  {
    title: "I Don't Have A Key",
    icon: 'help-circle-outline',
    url: 'https://openrouter.ai/docs/api-keys',
    testID: 'connections-openrouter-link-docs',
  },
  {
    title: 'Manage Keys (openrouter.ai)',
    icon: 'key-outline',
    url: 'https://openrouter.ai/settings/keys',
    testID: 'connections-openrouter-link-keys',
  },
  {
    title: 'Manage Credit Balance (openrouter.ai)',
    icon: 'card-outline',
    url: 'https://openrouter.ai/credits',
    testID: 'connections-openrouter-link-credits',
  },
] as const;

type OpenRouterKeySectionProps = {
  readonly hasStoredKey: boolean;
  readonly onEditKey: () => void;
};

/**
 * The OpenRouter section of API Keys (APIKeySettingsView.swift:85-104): edit
 * the key in a sheet, plus links out to openrouter.ai. The footer says
 * whether a key is stored, which Latent Spaces does not show.
 */
export const OpenRouterKeySection = ({
  hasStoredKey,
  onEditKey,
}: OpenRouterKeySectionProps) => (
  <FormSection
    testID="connections-openrouter"
    header="OpenRouter"
    footer={
      hasStoredKey
        ? 'A key is stored on this device.'
        : 'No key stored yet. Models through OpenRouter need one.'
    }
  >
    {/* rectangle.and.pencil.and.ellipsis.rtl */}
    <FormButtonRow
      testID="connections-openrouter-edit"
      title="Edit OpenRouter API Key"
      icon="create-outline"
      onPress={onEditKey}
    />
    {OPENROUTER_LINKS.map((link) => (
      <FormButtonRow
        key={link.testID}
        testID={link.testID}
        title={link.title}
        icon={link.icon}
        onPress={() => void Linking.openURL(link.url)}
      />
    ))}
  </FormSection>
);
