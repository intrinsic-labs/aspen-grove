import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SelectableProvider } from '@domain/entities';
import { SELECTABLE_PROVIDERS } from '@domain/entities';
import { AppInput, AppText } from '@/interface/ui/value-objects';
import { useModelPickerData } from './useModelPickerData';

const PROVIDER_LABELS: Record<SelectableProvider, string> = {
  openrouter: 'OpenRouter',
  lmstudio: 'LM Studio',
};

const MAX_VISIBLE_OPTIONS = 25;

type ModelPickerFieldProps = {
  readonly provider: SelectableProvider;
  readonly onChangeProvider: (provider: SelectableProvider) => void;
  readonly modelIdentifier: string;
  readonly onChangeModelIdentifier: (identifier: string) => void;
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly secondary: string;
  };
};

/**
 * Provider + model selection for the agent editor. One data source per
 * provider: the cached OpenRouter catalog (searchable) or live LM Studio
 * discovery. Unlisted OpenRouter identifiers can be used verbatim — the
 * catalog is a convenience, not a gate.
 */
export const ModelPickerField = ({
  provider,
  onChangeProvider,
  modelIdentifier,
  onChangeModelIdentifier,
  colors,
}: ModelPickerFieldProps) => {
  const picker = useModelPickerData(provider);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? picker.options.filter(
          (option) =>
            option.id.toLowerCase().includes(query) ||
            option.label.toLowerCase().includes(query)
        )
      : picker.options;
    return matches.slice(0, MAX_VISIBLE_OPTIONS);
  }, [picker.options, search]);

  const trimmedSearch = search.trim();
  const showCustomRow =
    provider === 'openrouter' &&
    trimmedSearch.length > 0 &&
    !picker.options.some((option) => option.id === trimmedSearch);

  return (
    <View style={styles.container}>
      <View style={styles.providerRow}>
        {SELECTABLE_PROVIDERS.map((candidate) => {
          const isSelected = candidate === provider;
          return (
            <Pressable
              key={candidate}
              onPress={() => {
                if (candidate !== provider) {
                  onChangeProvider(candidate);
                  onChangeModelIdentifier('');
                  setSearch('');
                }
              }}
              style={({ pressed }) => [
                styles.providerChip,
                {
                  borderColor: isSelected ? colors.primary : colors.line,
                  backgroundColor: isSelected
                    ? `${colors.primary}15`
                    : 'transparent',
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <AppText
                variant="meta"
                style={{
                  color: isSelected ? colors.primary : colors.secondary,
                }}
              >
                {PROVIDER_LABELS[candidate]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {modelIdentifier.length > 0 ? (
        <View
          style={[styles.selectedModelRow, { borderColor: colors.primary }]}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <AppText
            variant="meta"
            numberOfLines={1}
            style={[styles.selectedModelText, { color: colors.primary }]}
          >
            {modelIdentifier}
          </AppText>
          <Pressable
            onPress={() => onChangeModelIdentifier('')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <Ionicons name="close-circle" size={16} color={colors.secondary} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <AppInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            provider === 'openrouter'
              ? 'Search models or paste an identifier…'
              : 'Filter discovered models…'
          }
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, styles.flexInput]}
        />
        <Pressable
          onPress={picker.refresh}
          disabled={picker.loading}
          style={({ pressed }) => [
            styles.iconButton,
            {
              borderColor: colors.line,
              opacity: pressed || picker.loading ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons name="refresh" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {picker.loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : picker.error ? (
        <AppText variant="meta" tone="accent" style={styles.statusText}>
          {picker.error}
        </AppText>
      ) : (
        <View style={styles.optionList}>
          {showCustomRow ? (
            <Pressable
              onPress={() => onChangeModelIdentifier(trimmedSearch)}
              style={({ pressed }) => [
                styles.optionRow,
                { borderColor: colors.line, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <AppText variant="meta" numberOfLines={1}>
                Use “{trimmedSearch}” as a custom identifier
              </AppText>
            </Pressable>
          ) : null}

          {filteredOptions.map((option) => {
            const isSelected = option.id === modelIdentifier;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChangeModelIdentifier(option.id)}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    borderColor: isSelected ? colors.primary : colors.line,
                    backgroundColor: isSelected
                      ? `${colors.primary}15`
                      : 'transparent',
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <AppText
                    variant="meta"
                    numberOfLines={1}
                    style={styles.optionLabel}
                  >
                    {option.label}
                  </AppText>
                  {option.loaded ? (
                    <Ionicons
                      name="flash"
                      size={12}
                      color={colors.primary}
                    />
                  ) : null}
                </View>
                <AppText
                  variant="meta"
                  numberOfLines={1}
                  style={[styles.optionDetail, { color: colors.secondary }]}
                >
                  {option.id}
                  {option.detail ? `  ·  ${option.detail}` : ''}
                </AppText>
              </Pressable>
            );
          })}

          {filteredOptions.length === 0 && !showCustomRow ? (
            <AppText
              variant="meta"
              style={[styles.statusText, { color: colors.secondary }]}
            >
              {provider === 'lmstudio'
                ? 'No models found. Check the LM Studio connection in Settings.'
                : 'No matching models.'}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  selectedModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  selectedModelText: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flexInput: {
    flex: 1,
  },
  searchInput: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  iconButton: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  centerWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionList: {
    gap: 6,
  },
  optionRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionLabel: {
    flex: 1,
  },
  optionDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  statusText: {
    paddingVertical: 8,
  },
});
