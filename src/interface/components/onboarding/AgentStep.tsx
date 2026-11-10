import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { AgentEditorSheet } from '../settings/agents/AgentEditorSheet';
import { AgentTemplateList } from '../settings/agents/AgentTemplateList';
import { ModelPickerField } from '../settings/agents/ModelPickerField';
import { OnboardingHeading } from './OnboardingHeading';
import type { OnboardingFlow } from './useOnboardingFlow';

type AgentStepProps = {
  readonly flow: OnboardingFlow;
};

/**
 * Step 2: the agent the first tree talks to. OpenRouter offers the agent
 * templates (the first is preselected) and the full editor; LM Studio lists
 * the models its server reports.
 */
export const AgentStep = ({ flow }: AgentStepProps) => {
  const { colors } = useAspenGroveTheme();
  const [editing, setEditing] = useState(false);

  return (
    <View testID="onboarding-step-agent" style={styles.container}>
      <OnboardingHeading
        title="Choose an agent"
        lead="An agent is a model with a system prompt and a temperature. You can change it, or add more, in Settings."
      />

      {flow.provider === 'openrouter' ? (
        <View style={styles.block}>
          <AgentTemplateList
            testIDPrefix="onboarding-template"
            selectedKey={flow.templateKey}
            onSelect={(template) => flow.chooseTemplate(template.key)}
          />
          {flow.customDraft ? (
            <AppText
              testID="onboarding-agent-custom"
              variant="meta"
              tone="accent"
            >
              {flow.customDraft.name} · {flow.customDraft.modelIdentifier}
            </AppText>
          ) : null}
          <Pressable
            testID="onboarding-agent-customize"
            onPress={() => setEditing(true)}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <AppText variant="meta" tone="accent">
              {flow.customDraft ? 'Edit this agent…' : 'Customize…'}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ModelPickerField
          provider="lmstudio"
          onChangeProvider={flow.chooseProvider}
          modelIdentifier={flow.lmStudioModelId}
          onChangeModelIdentifier={flow.setLmStudioModelId}
          colors={colors}
          testIDPrefix="onboarding-agent"
          lockProvider
        />
      )}

      <AgentEditorSheet
        visible={editing}
        title="Customize Agent"
        initialDraft={flow.draft}
        submitLabel="Use"
        onCancel={() => setEditing(false)}
        onSubmit={async (draft) => {
          flow.setCustomDraft(draft);
          setEditing(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 28,
  },
  block: {
    gap: 14,
  },
});
