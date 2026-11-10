import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppPillButton,
  AppScreen,
  AppText,
} from '@/interface/ui/value-objects';
import { AgentStep } from './AgentStep';
import { ProviderStep } from './ProviderStep';
import { useOnboardingFlow } from './useOnboardingFlow';

/**
 * First-run setup, shown once on a fresh install (and from the "Set up"
 * hints after a skip): connect a provider, choose an agent, then open a
 * first tree. Skippable from every step.
 */
const OnboardingView = () => {
  const insets = useSafeAreaInsets();
  const flow = useOnboardingFlow();
  const onAgentStep = flow.step === 'agent';

  return (
    <AppScreen testID="onboarding-screen">
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerSide}>
          {onAgentStep ? (
            <Pressable
              testID="onboarding-back"
              onPress={flow.goBack}
              disabled={flow.busy}
              hitSlop={10}
            >
              <AppText variant="meta" tone="secondary">
                Back
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <AppText
          testID="onboarding-step-indicator"
          variant="meta"
          tone="muted"
        >
          {onAgentStep ? '2 of 2' : '1 of 2'}
        </AppText>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Pressable
            testID="onboarding-skip"
            onPress={() => void flow.skip()}
            disabled={flow.busy}
            hitSlop={10}
          >
            <AppText variant="meta" tone="secondary">
              Skip
            </AppText>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        enabled
        bottomOffset={24}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {onAgentStep ? <AgentStep flow={flow} /> : <ProviderStep flow={flow} />}

        {flow.error ? (
          <AppText testID="onboarding-error" variant="meta" tone="accent">
            {flow.error}
          </AppText>
        ) : null}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {onAgentStep ? (
          <AppPillButton
            testID="onboarding-begin"
            label={flow.busy ? 'Starting…' : 'Begin'}
            variant="outline"
            disabled={!flow.canBegin}
            onPress={() => void flow.begin()}
          />
        ) : (
          <AppPillButton
            testID="onboarding-continue"
            label="Continue"
            variant="outline"
            disabled={!flow.canContinue || flow.busy}
            onPress={() => void flow.goToAgentStep()}
          />
        )}
      </View>
    </AppScreen>
  );
};

export default OnboardingView;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  headerSide: {
    minWidth: 60,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
});
