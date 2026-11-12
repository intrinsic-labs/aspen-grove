import {
  FormLinkRow,
  FormPickerRow,
  FormSection,
  type FormPickerOption,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { ModelFooter } from './ModelFooter';
import { PROVIDER_OPTIONS } from './provider-default-model';
import type { TreeModelSettings } from './useTreeModelSettings';

type ProviderOptionsSectionProps = {
  readonly settings: TreeModelSettings;
  readonly onOpenModelList: () => void;
};

const NO_MODEL_NOTE = 'Choose a model for this tree.';

/**
 * The Form's first header sits 18 pt higher than a header after a card does:
 * the Provider card's top is 156 pt from the screen top (measured, shot 40).
 */
const firstSectionStyle = {
  marginTop: loomUiTokens.settingsForm.headerTopGap - 18,
} as const;

/** LM Studio's models as menu items, the tree's own kept when unlisted. */
const lmStudioItems = (
  settings: TreeModelSettings
): readonly FormPickerOption<string>[] => {
  const items = settings.picker.options.map((option) => ({
    value: option.id,
    label: option.label,
  }));
  const { modelId } = settings;
  return modelId && !items.some((item) => item.value === modelId)
    ? [{ value: modelId, label: modelId }, ...items]
    : items;
};

const footerDescription = (settings: TreeModelSettings): string | undefined => {
  if (
    settings.picker.settledFor === settings.provider &&
    settings.picker.error
  ) {
    return settings.picker.error;
  }
  if (!settings.modelId) {
    return settings.hasAgent ? undefined : NO_MODEL_NOTE;
  }
  return settings.provider === 'openrouter'
    ? settings.selected?.description
    : settings.selected?.detail;
};

/**
 * "Provider Options" (TreeModelSettingsView.swift:73-143): the Provider menu
 * picker, then Model. OpenRouter's Model pushes the model list
 * (`.pickerStyle(.navigationLink)`); LM Studio's is a menu, as Latent
 * Spaces' short Anthropic list is.
 */
export const ProviderOptionsSection = ({
  settings,
  onOpenModelList,
}: ProviderOptionsSectionProps) => (
  <FormSection
    header="Provider Options"
    style={firstSectionStyle}
    footer={
      <ModelFooter
        modelId={settings.modelId}
        description={footerDescription(settings)}
      />
    }
  >
    <FormPickerRow
      testID="tree-model-provider"
      title="Provider"
      value={settings.provider}
      options={PROVIDER_OPTIONS}
      onChange={settings.chooseProvider}
    />
    {settings.provider === 'openrouter' ? (
      <FormLinkRow
        testID="tree-model-model"
        title="Model"
        value={settings.selected?.label ?? settings.modelId ?? undefined}
        onPress={onOpenModelList}
      />
    ) : (
      <FormPickerRow
        testID="tree-model-model"
        title="Model"
        value={settings.modelId ?? ''}
        options={lmStudioItems(settings)}
        onChange={settings.chooseModel}
      />
    )}
  </FormSection>
);
