import { StyleSheet, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { FormSurfaceProvider, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { ProviderSection } from '../../settings/agents/editor/ProviderSection';
import { TemplateSection } from '../../settings/agents/editor/TemplateSection';
import { LmStudioFormSection } from '../../settings/connections/LmStudioFormSection';
import { OpenRouterKeySheet } from '../../settings/connections/OpenRouterKeySheet';
import { LmStudioModelSection } from './LmStudioModelSection';
import { OpenRouterSetupSection } from './OpenRouterSetupSection';
import type { OnboardingSetup } from './useOnboardingSetup';

type OnboardingSetupPageProps = {
  readonly setup: OnboardingSetup;
  readonly error: string | null;
};

/**
 * Onboarding's last page, Aspen Grove's own: where models come from, in the
 * Form pieces of Settings (Latent Spaces' Provider picker and API Keys
 * page). Begin Weaving under it starts the first tree.
 */
export const OnboardingSetupPage = ({
  setup,
  error,
}: OnboardingSetupPageProps) => (
  <FormSurfaceProvider value="sheet">
    <KeyboardAwareScrollView
      testID="onboarding-step-setup"
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      <ProviderSection
        provider={setup.provider}
        onChange={setup.chooseProvider}
        testIDPrefix="onboarding-provider"
      />

      {setup.provider === 'openrouter' ? (
        <>
          <OpenRouterSetupSection
            hasKey={setup.hasOpenRouterKey}
            onEditKey={setup.openKeyEditor}
          />
          <TemplateSection
            header="Model"
            testIDPrefix="onboarding-template"
            selectedKey={setup.templateKey}
            onSelect={(template) => setup.setTemplateKey(template.key)}
          />
        </>
      ) : (
        <>
          <LmStudioFormSection
            controller={setup.connections}
            showAdvanced={false}
            footer="Start the server in LM Studio on your computer, then test the connection."
          />
          <LmStudioModelSection
            connectionStatus={setup.connections.lmstudioConnectionStatus}
            modelId={setup.lmStudioModelId}
            onSelect={setup.setLmStudioModelId}
          />
        </>
      )}

      {error ? (
        <Text testID="onboarding-error" style={[formText.footer, styles.error]}>
          {error}
        </Text>
      ) : null}

      <OpenRouterKeySheet
        visible={setup.editingKey}
        currentKey={setup.connections.apiKeyInput}
        onCancel={setup.closeKeyEditor}
        onSave={setup.saveKey}
      />
    </KeyboardAwareScrollView>
  </FormSurfaceProvider>
);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: loomUiTokens.settingsForm.sectionInset,
    paddingBottom: 24,
  },
  error: {
    color: '#FF453A',
    marginTop: 16,
    paddingHorizontal: loomUiTokens.settingsForm.rowPaddingHorizontal,
  },
});
