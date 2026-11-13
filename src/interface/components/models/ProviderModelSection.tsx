import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SelectableProvider } from '@domain/entities';
import {
  FormLinkRow,
  FormPickerRow,
  FormSection,
  type FormPickerOption,
} from '@/interface/ui/components/form';
import { splitModelName } from './model-info-format';
import type { ModelOption } from './model-options';
import { PROVIDER_OPTIONS } from './provider-default-model';

type ProviderModelSectionProps = {
  readonly header?: string;
  readonly provider: SelectableProvider;
  readonly onChangeProvider: (provider: SelectableProvider) => void;
  /** The chosen model's id, without the provider. */
  readonly modelId: string | null;
  /** The chosen model as listed, when its provider's list has it. */
  readonly selected: ModelOption | undefined;
  /** LM Studio's models, for its menu. */
  readonly options: readonly ModelOption[];
  readonly onChooseLmStudioModel: (id: string) => void;
  /** OpenRouter's Model row pushes the model browser. */
  readonly onOpenModelBrowser: () => void;
  readonly footer?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  /** Rows: `<prefix>-provider`, `<prefix>-model`. */
  readonly testIDPrefix: string;
};

/** LM Studio's models as menu items, the chosen one kept when unlisted. */
const lmStudioItems = (
  options: readonly ModelOption[],
  modelId: string | null
): readonly FormPickerOption<string>[] => {
  const items = options.map((option) => ({
    value: option.id,
    label: option.label,
  }));
  return modelId && !items.some((item) => item.value === modelId)
    ? [{ value: modelId, label: modelId }, ...items]
    : items;
};

/** The Model row's value: OpenRouter's name without its maker, else the id. */
const modelLabel = (
  selected: ModelOption | undefined,
  modelId: string | null
): string | undefined => {
  if (selected?.openRouter) {
    return splitModelName(selected.openRouter).title;
  }
  return selected?.label ?? modelId ?? undefined;
};

/**
 * Provider and Model, as Latent Spaces' tree Model Settings lays them out
 * (TreeModelSettingsView.swift:73-143): the Provider menu picker, then
 * Model. OpenRouter's Model pushes the model browser
 * (`.pickerStyle(.navigationLink)`); LM Studio's short list is a menu.
 * Shared by a tree's Model Settings and the agent editor.
 */
export const ProviderModelSection = ({
  header,
  provider,
  onChangeProvider,
  modelId,
  selected,
  options,
  onChooseLmStudioModel,
  onOpenModelBrowser,
  footer,
  style,
  testIDPrefix,
}: ProviderModelSectionProps) => (
  <FormSection header={header} style={style} footer={footer}>
    <FormPickerRow
      testID={`${testIDPrefix}-provider`}
      title="Provider"
      value={provider}
      options={PROVIDER_OPTIONS}
      onChange={onChangeProvider}
    />
    {provider === 'openrouter' ? (
      <FormLinkRow
        testID={`${testIDPrefix}-model`}
        title="Model"
        value={modelLabel(selected, modelId) ?? 'Choose'}
        onPress={onOpenModelBrowser}
      />
    ) : (
      <FormPickerRow
        testID={`${testIDPrefix}-model`}
        title="Model"
        value={modelId ?? ''}
        options={lmStudioItems(options, modelId)}
        onChange={onChooseLmStudioModel}
      />
    )}
  </FormSection>
);
