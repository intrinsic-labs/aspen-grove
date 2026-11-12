import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { SelectableProvider } from '@domain/entities';
import { FormRow, FormSection, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import {
  customModelIdentifier,
  filterModelOptions,
} from '../model-option-filter';
import { useModelPickerData } from '../useModelPickerData';
import { FormCheckRow } from './FormCheckRow';
import { ModelSearchRow } from './ModelSearchRow';
import { ProviderSection } from './ProviderSection';

const form = loomUiTokens.settingsForm;

type ModelSectionsProps = {
  readonly provider: SelectableProvider;
  readonly onChangeProvider: (provider: SelectableProvider) => void;
  readonly modelIdentifier: string;
  readonly onChangeModelIdentifier: (identifier: string) => void;
  readonly testIDPrefix: string;
};

/**
 * Provider and model for the agent editor, in Form sections: the provider
 * as an inline picker (as Latent Spaces' Provider picker,
 * LoomSettingsView.swift:122-134), then the chosen model, a search field
 * and the matching models.
 */
export const ModelSections = ({
  provider,
  onChangeProvider,
  modelIdentifier,
  onChangeModelIdentifier,
  testIDPrefix,
}: ModelSectionsProps) => {
  const picker = useModelPickerData(provider);
  const [search, setSearch] = useState('');
  const options = useMemo(
    () => filterModelOptions(picker.options, search),
    [picker.options, search]
  );
  const custom = customModelIdentifier(provider, search, picker.options);

  const listFooter = picker.error ? (
    <Text
      testID={`${testIDPrefix}-model-error`}
      style={[formText.footer, styles.error]}
    >
      {picker.error}
    </Text>
  ) : !picker.loading && options.length === 0 && !custom ? (
    provider === 'lmstudio' ? (
      'No models found. Check the LM Studio connection in Settings.'
    ) : (
      'No matching models.'
    )
  ) : provider === 'openrouter' ? (
    'Search the OpenRouter catalog, or paste any model id.'
  ) : undefined;

  return (
    <>
      <ProviderSection
        provider={provider}
        testIDPrefix={`${testIDPrefix}-model-provider`}
        onChange={(candidate) => {
          onChangeProvider(candidate);
          onChangeModelIdentifier('');
          setSearch('');
        }}
      />

      <FormSection
        testID={`${testIDPrefix}-model`}
        header="Model"
        footer={listFooter}
      >
        {modelIdentifier.length > 0 ? (
          <FormRow testID={`${testIDPrefix}-model-selected`}>
            <Text style={formText.body}>Selected</Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[formText.value, styles.selectedValue]}
            >
              {modelIdentifier}
            </Text>
            <Pressable
              testID={`${testIDPrefix}-model-clear`}
              onPress={() => onChangeModelIdentifier('')}
              accessibilityLabel="Clear model"
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={form.colors.tertiaryLabel}
              />
            </Pressable>
          </FormRow>
        ) : null}
        <ModelSearchRow
          value={search}
          onChangeText={setSearch}
          placeholder={
            provider === 'openrouter'
              ? 'Search or paste a model id'
              : 'Filter discovered models'
          }
          loading={picker.loading}
          onRefresh={picker.refresh}
          testIDPrefix={testIDPrefix}
        />
        {custom ? (
          <FormRow
            testID={`${testIDPrefix}-model-custom`}
            onPress={() => onChangeModelIdentifier(custom)}
            accessibilityLabel={`Use ${custom}`}
          >
            <Text numberOfLines={1} style={[formText.accent, styles.selected]}>
              Use “{custom}” as a custom id
            </Text>
          </FormRow>
        ) : null}
        {picker.loading || picker.error
          ? null
          : options.map((option) => (
              <FormCheckRow
                key={option.id}
                testID={`${testIDPrefix}-model-option-${option.id}`}
                title={option.label}
                detail={
                  option.detail ? `${option.id} · ${option.detail}` : option.id
                }
                badge={
                  option.loaded ? (
                    <Ionicons
                      name="flash"
                      size={13}
                      color={loomUiTokens.colors.accentColor}
                    />
                  ) : null
                }
                selected={option.id === modelIdentifier}
                onPress={() => onChangeModelIdentifier(option.id)}
              />
            ))}
      </FormSection>
    </>
  );
};

const styles = StyleSheet.create({
  selectedValue: {
    flex: 1,
    textAlign: 'right',
  },
  selected: {
    flexShrink: 1,
    textAlign: 'right',
  },
  error: {
    color: '#FF453A',
  },
});
