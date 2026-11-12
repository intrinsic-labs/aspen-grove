import { Linking } from 'react-native';
import { FormButtonRow, FormSection } from '@/interface/ui/components/form';

const KEY_DOCS_URL = 'https://openrouter.ai/docs/api-keys';

type OpenRouterSetupSectionProps = {
  readonly hasKey: boolean;
  readonly onEditKey: () => void;
};

/**
 * The OpenRouter key on onboarding's last page: the same key sheet as
 * Settings → Connections (APIKeySettingsView.swift's pattern), and where to
 * get a key.
 */
export const OpenRouterSetupSection = ({
  hasKey,
  onEditKey,
}: OpenRouterSetupSectionProps) => (
  <FormSection
    testID="onboarding-openrouter"
    header="OpenRouter"
    // Short, so the Model rows start inside the 400 pt page (page 5 already
    // says keys stay on the device).
    footer={hasKey ? 'A key is stored on this device.' : undefined}
  >
    {/* rectangle.and.pencil.and.ellipsis.rtl */}
    <FormButtonRow
      testID="onboarding-openrouter-key"
      title={hasKey ? 'Edit OpenRouter API Key' : 'Add OpenRouter API Key'}
      icon="create-outline"
      onPress={onEditKey}
    />
    <FormButtonRow
      testID="onboarding-openrouter-key-docs"
      title="I Don't Have A Key"
      icon="help-circle-outline"
      onPress={() => void Linking.openURL(KEY_DOCS_URL)}
    />
  </FormSection>
);
