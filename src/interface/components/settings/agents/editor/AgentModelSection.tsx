import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { SelectableProvider } from '@domain/entities';
import { formText } from '@/interface/ui/components/form';
import { useConnectedProviders } from '../../../models/useConnectedProviders';
import { ModelFooter } from '../../../models/ModelFooter';
import { providerDefaultModel } from '../../../models/provider-default-model';
import { ProviderModelSection } from '../../../models/ProviderModelSection';
import type { AgentDraft } from '../agent-editor-types';
import type { AgentModelSelection } from './useAgentModelSelection';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type AgentModelSectionProps = {
  readonly draft: AgentDraft;
  readonly selection: AgentModelSelection;
  readonly onChange: (changes: Partial<AgentDraft>) => void;
  readonly onOpenModelBrowser: () => void;
};

/**
 * The agent's provider and model, laid out as a tree's Model Settings lays
 * them out: the Model row of OpenRouter, Anthropic and OpenAI pushes the
 * model browser, LM Studio's is a menu. A new provider starts on its default
 * model (onboarding's first template on OpenRouter; a loaded model on LM
 * Studio, or the newest on Anthropic and OpenAI, once their list answers).
 */
export const AgentModelSection = ({
  draft,
  selection,
  onChange,
  onOpenModelBrowser,
}: AgentModelSectionProps) => {
  const { picker, listReady, modelId, selected } = selection;

  const providers = useConnectedProviders(draft.provider);

  // These lists arrive after the switch: then pick from them.
  useEffect(() => {
    if (draft.provider === 'openrouter' || modelId || !listReady) {
      return;
    }
    const id = providerDefaultModel(draft.provider, picker.options, null);
    if (id) {
      onChange({ modelIdentifier: id });
    }
  }, [draft.provider, listReady, modelId, onChange, picker.options]);

  const chooseProvider = (provider: SelectableProvider) =>
    onChange({
      provider,
      modelIdentifier:
        provider === 'openrouter'
          ? (providerDefaultModel('openrouter', [], null) ?? '')
          : '',
    });

  const listError = picker.settledFor === draft.provider ? picker.error : null;

  return (
    <ProviderModelSection
      header="Model"
      testIDPrefix="agent-editor"
      provider={draft.provider}
      providers={providers}
      onChangeProvider={chooseProvider}
      modelId={modelId}
      selected={selected}
      options={picker.options}
      onChooseLmStudioModel={(id) => onChange({ modelIdentifier: id })}
      onOpenModelBrowser={onOpenModelBrowser}
      footer={
        listError ? (
          <Text
            testID="agent-editor-model-error"
            style={[formText.footer, styles.error]}
          >
            {listError}
          </Text>
        ) : (
          <ModelFooter
            testIDPrefix="agent-editor"
            modelId={modelId}
            description={
              draft.provider === 'lmstudio'
                ? selected?.detail
                : (selected?.description ?? selected?.detail)
            }
          />
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  error: {
    color: loomUiTokens.colors.destructive,
  },
});
