import {
  FormSection,
  FormSliderRow,
  FormToggleRow,
  FormValueRow,
} from '@/interface/ui/components/form';
import {
  formatTemperature,
  formatTokenCount,
  TEMPERATURE_RANGE,
} from './tree-model-values';
import type { TreeModelSettings } from './useTreeModelSettings';

type ParameterSectionsProps = {
  readonly settings: TreeModelSettings;
};

/**
 * Stream Messages, Maximum Output Tokens and Temperature
 * (TreeModelSettingsView.swift:146-191). Aspen Grove always streams, so the
 * toggle stays on and disabled, as Latent Spaces' is for OpenRouter.
 * Nothing here is editable until the tree has a model.
 */
export const ParameterSections = ({ settings }: ParameterSectionsProps) => {
  const disabled = !settings.hasAgent;
  return (
    <>
      <FormSection>
        <FormToggleRow
          testID="tree-model-stream"
          title="Stream Messages"
          value
          onValueChange={() => undefined}
          disabled
        />
      </FormSection>

      <FormSection>
        <FormValueRow
          testID="tree-model-max-tokens-value"
          title="Maximum Output Tokens"
          value={formatTokenCount(settings.maxTokens)}
        />
        {/* Remounted when the range changes: the native slider keeps a
            value it clamped to the old range. */}
        <FormSliderRow
          key={settings.maxAllowed}
          testID="tree-model-max-tokens-slider"
          value={settings.maxTokens}
          minimumValue={1}
          maximumValue={settings.maxAllowed}
          step={1}
          onValueChange={settings.slideMaxTokens}
          onSlidingComplete={settings.commitMaxTokens}
          disabled={disabled || settings.useMaxTokens}
        />
        <FormToggleRow
          testID="tree-model-use-max-tokens"
          title="Always use maximum allowed"
          value={settings.useMaxTokens}
          onValueChange={settings.setUseMaxTokens}
          disabled={disabled}
        />
      </FormSection>

      <FormSection>
        <FormValueRow
          testID="tree-model-temperature-value"
          title="Temperature"
          value={formatTemperature(settings.temperature)}
        />
        <FormSliderRow
          testID="tree-model-temperature-slider"
          value={settings.temperature}
          minimumValue={TEMPERATURE_RANGE.min}
          maximumValue={TEMPERATURE_RANGE.max}
          step={TEMPERATURE_RANGE.step}
          onValueChange={settings.slideTemperature}
          onSlidingComplete={settings.commitTemperature}
          disabled={disabled}
        />
      </FormSection>
    </>
  );
};
