import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { FormSurfaceProvider, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { ProviderSection } from '../../settings/agents/editor/ProviderSection';
import { TemplateSection } from '../../settings/agents/editor/TemplateSection';
import { LmStudioFormSection } from '../../settings/connections/LmStudioFormSection';
import { OpenRouterKeySheet } from '../../settings/connections/OpenRouterKeySheet';
import { LmStudioModelSection } from './LmStudioModelSection';
import { OpenRouterSetupSection } from './OpenRouterSetupSection';
import { ScrollEdgeFades } from './ScrollEdgeFades';
import { useRevealOnAppear } from './useRevealOnAppear';
import type { OnboardingSetup } from './useOnboardingSetup';

type OnboardingSetupPageProps = {
  readonly setup: OnboardingSetup;
  readonly error: string | null;
};

/**
 * Onboarding's last page, Aspen Grove's own: where models come from, in the
 * Form pieces of Settings (Latent Spaces' Provider picker and API Keys
 * page). It has the whole height down to Begin Weaving and scrolls under
 * soft edges. The Model section shows once a model can be picked: an
 * OpenRouter key is saved, or LM Studio's connection test succeeded.
 */
export const OnboardingSetupPage = ({
  setup,
  error,
}: OnboardingSetupPageProps) => {
  const lmStudioConnected =
    setup.connections.lmstudioConnectionStatus === 'connected';
  const { scrollRef, onSectionLayout } = useRevealOnAppear(
    loomUiTokens.onboarding.setupFade.top,
    `${setup.keySaves}:${lmStudioConnected}`
  );
  return (
    <FormSurfaceProvider value="sheet">
      <View style={styles.page}>
        <KeyboardAwareScrollView
          ref={scrollRef}
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
              {setup.hasOpenRouterKey ? (
                <View onLayout={onSectionLayout}>
                  <TemplateSection
                    header="Model"
                    testIDPrefix="onboarding-template"
                    selectedKey={setup.templateKey}
                    onSelect={(template) => setup.setTemplateKey(template.key)}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <LmStudioFormSection
                controller={setup.connections}
                showAdvanced={false}
                footer="Start the server in LM Studio on your computer, then test the connection."
              />
              {lmStudioConnected ? (
                <View onLayout={onSectionLayout}>
                  <LmStudioModelSection
                    modelId={setup.lmStudioModelId}
                    onSelect={setup.setLmStudioModelId}
                  />
                </View>
              ) : null}
            </>
          )}

          {error ? (
            <Text
              testID="onboarding-error"
              style={[formText.footer, styles.error]}
            >
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
        <ScrollEdgeFades />
      </View>
    </FormSurfaceProvider>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // Room under the top fade, and for the last row to clear the bottom one.
  content: {
    paddingHorizontal: loomUiTokens.settingsForm.sectionInset,
    paddingTop: loomUiTokens.onboarding.setupFade.top,
    paddingBottom: loomUiTokens.onboarding.setupFade.bottom,
  },
  error: {
    color: '#FF453A',
    marginTop: 16,
    paddingHorizontal: loomUiTokens.settingsForm.rowPaddingHorizontal,
  },
});
