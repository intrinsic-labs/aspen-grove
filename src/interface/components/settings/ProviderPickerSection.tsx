import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SelectableProvider } from '@domain/entities';
import { SELECTABLE_PROVIDERS } from '@domain/entities';
import { AppText, SettingsSection } from '@/interface/ui/value-objects';

const PROVIDER_LABELS: Record<SelectableProvider, string> = {
  openrouter: 'OpenRouter',
  lmstudio: 'LM Studio',
};

const PROVIDER_DESCRIPTIONS: Record<SelectableProvider, string> = {
  openrouter: 'Cloud-based access to many models',
  lmstudio: 'Local inference with MCP tools',
};

type ProviderPickerSectionProps = {
  readonly selectedProvider: SelectableProvider;
  readonly onChangeProvider: (provider: SelectableProvider) => void;
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly secondary: string;
  };
};

export const ProviderPickerSection = ({
  selectedProvider,
  onChangeProvider,
  colors,
}: ProviderPickerSectionProps) => {
  return (
    <SettingsSection title="Provider">
      <View style={styles.providerList}>
        {SELECTABLE_PROVIDERS.map((provider) => {
          const isSelected = provider === selectedProvider;

          return (
            <Pressable
              key={provider}
              onPress={() => onChangeProvider(provider)}
              style={({ pressed }) => [
                styles.providerItem,
                {
                  borderColor: isSelected ? colors.primary : colors.line,
                  backgroundColor: isSelected
                    ? `${colors.primary}15`
                    : 'transparent',
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={styles.providerContent}>
                <View style={styles.providerHeader}>
                  <AppText variant="body" style={styles.providerLabel}>
                    {PROVIDER_LABELS[provider]}
                  </AppText>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </View>
                <AppText
                  variant="meta"
                  style={{ color: colors.secondary, marginTop: 2 }}
                >
                  {PROVIDER_DESCRIPTIONS[provider]}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  providerList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  providerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  providerContent: {
    flex: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerLabel: {
    fontWeight: '500',
  },
});
