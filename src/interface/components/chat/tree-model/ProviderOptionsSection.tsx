import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { ModelFooter } from '../../models/ModelFooter';
import { ProviderModelSection } from '../../models/ProviderModelSection';
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
 * "Provider Options" (TreeModelSettingsView.swift:73-143): Provider and
 * Model, the model's id and description in the footer.
 */
export const ProviderOptionsSection = ({
  settings,
  onOpenModelList,
}: ProviderOptionsSectionProps) => (
  <ProviderModelSection
    header="Provider Options"
    style={firstSectionStyle}
    footer={
      <ModelFooter
        testIDPrefix="tree-model"
        modelId={settings.modelId}
        description={footerDescription(settings)}
      />
    }
    provider={settings.provider}
    onChangeProvider={settings.chooseProvider}
    modelId={settings.modelId}
    selected={settings.selected}
    options={settings.picker.options}
    onChooseLmStudioModel={settings.chooseModel}
    onOpenModelBrowser={onOpenModelList}
    testIDPrefix="tree-model"
  />
);
