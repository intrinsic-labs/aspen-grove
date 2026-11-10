import { StyleSheet, View } from 'react-native';
import { LmStudioConnectionSection } from '../settings/connections/LmStudioConnectionSection';
import { OpenRouterConnectionSection } from '../settings/connections/OpenRouterConnectionSection';
import { OnboardingHeading } from './OnboardingHeading';
import { ProviderOption } from './ProviderOption';
import type { OnboardingFlow } from './useOnboardingFlow';

type ProviderStepProps = {
  readonly flow: OnboardingFlow;
};

/** Step 1: pick OpenRouter or LM Studio and connect it. */
export const ProviderStep = ({ flow }: ProviderStepProps) => (
  <View testID="onboarding-step-provider" style={styles.container}>
    <OnboardingHeading
      showLeaf
      title="Connect a model"
      lead="Aspen Grove reaches models through OpenRouter, or through LM Studio on your own computer. Keys stay on this device."
    />

    <View style={styles.options}>
      <ProviderOption
        testID="onboarding-provider-openrouter"
        title="OpenRouter"
        detail="Many models, one key."
        selected={flow.provider === 'openrouter'}
        onPress={() => flow.chooseProvider('openrouter')}
      />
      <ProviderOption
        testID="onboarding-provider-lmstudio"
        title="LM Studio"
        detail="Local models on your computer."
        selected={flow.provider === 'lmstudio'}
        onPress={() => flow.chooseProvider('lmstudio')}
      />
    </View>

    {flow.provider === 'openrouter' ? (
      <OpenRouterConnectionSection
        controller={flow.connections}
        footer="Paste a key from openrouter.ai/keys."
      />
    ) : (
      <LmStudioConnectionSection
        controller={flow.connections}
        showAdvanced={false}
        footer="Start the local server in LM Studio, then test the connection."
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 28,
  },
  options: {
    gap: 10,
  },
});
