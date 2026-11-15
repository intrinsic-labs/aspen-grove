import {
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_AGENT_TEMPERATURE,
} from '@application/services/agent-defaults';
import {
  FormSection,
  FormSliderRow,
  FormTextFieldRow,
  FormValueRow,
} from '@/interface/ui/components/form';
import { maxTokensAllowed } from '../../../models/model-max-tokens';
import { formatTokensFull } from '../../../models/model-info-format';
import type { ModelOption } from '../../../models/model-options';
import { typedMaxTokens } from '../agent-draft-max-tokens';
import type { AgentDraft } from '../agent-editor-types';

type GenerationSectionsProps = {
  readonly draft: AgentDraft;
  /** The draft's model, once its provider's list has it. */
  readonly model: ModelOption | undefined;
  readonly onChange: (changes: Partial<AgentDraft>) => void;
};

const temperatureOf = (input: string): number => {
  const value = Number(input.replace(',', '.'));
  return Number.isFinite(value) ? value : DEFAULT_AGENT_TEMPERATURE;
};

/**
 * Temperature, maximum tokens and system prompt, laid out as Latent Spaces'
 * new-tree settings (LoomSettingsView.swift:183-207): a value row over its
 * slider, then the prompt in its own section. Max Tokens is held to the
 * model's limit, which the footer names.
 */
export const GenerationSections = ({
  draft,
  model,
  onChange,
}: GenerationSectionsProps) => {
  const temperature = temperatureOf(draft.temperatureInput);
  return (
    <>
      <FormSection
        header="Generation"
        footer={
          model
            ? `This model allows up to ${formatTokensFull(maxTokensAllowed(model))} output tokens.`
            : undefined
        }
      >
        <FormValueRow title="Temperature" value={temperature.toFixed(1)} />
        <FormSliderRow
          testID="agent-editor-temperature"
          value={temperature}
          minimumValue={0}
          maximumValue={2}
          step={0.1}
          onValueChange={(value) =>
            onChange({ temperatureInput: value.toFixed(1) })
          }
        />
        <FormTextFieldRow
          testID="agent-editor-max-tokens-input"
          title="Max Tokens"
          value={draft.maxTokensInput}
          onChangeText={(input) => onChange(typedMaxTokens(input, model))}
          placeholder="Provider default"
          keyboardType="number-pad"
          autoCorrect={false}
        />
      </FormSection>
      <FormSection header="System Prompt">
        <FormTextFieldRow
          testID="agent-editor-system-prompt-input"
          value={draft.systemPrompt}
          onChangeText={(systemPrompt) => onChange({ systemPrompt })}
          placeholder={DEFAULT_AGENT_SYSTEM_PROMPT}
          autoCapitalize="sentences"
          autoCorrect={false}
          multiline
          minHeight={120}
        />
      </FormSection>
    </>
  );
};
