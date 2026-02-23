import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AppInput,
  SettingsSection,
  SettingsStackRow,
} from '@interface/ui/system';

type OpenRouterSettingsSectionProps = {
  readonly apiKeyStatusText: string;
  readonly apiKeyInput: string;
  readonly onChangeApiKeyInput: (value: string) => void;
  readonly showApiKey: boolean;
  readonly onToggleShowApiKey: () => void;
  readonly modelIdentifierInput: string;
  readonly onChangeModelIdentifierInput: (value: string) => void;
  readonly colors: {
    readonly line: string;
    readonly primary: string;
  };
};

export const OpenRouterSettingsSection = ({
  apiKeyStatusText,
  apiKeyInput,
  onChangeApiKeyInput,
  showApiKey,
  onToggleShowApiKey,
  modelIdentifierInput,
  onChangeModelIdentifierInput,
  colors,
}: OpenRouterSettingsSectionProps) => {
  return (
    <SettingsSection title="OpenRouter" footer={apiKeyStatusText}>
      <SettingsStackRow label="API Key">
        <View style={styles.inputRow}>
          <AppInput
            value={apiKeyInput}
            onChangeText={onChangeApiKeyInput}
            placeholder="sk-or-..."
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.flexInput]}
          />
          <Pressable
            onPress={onToggleShowApiKey}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: colors.line,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons
              name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        </View>
      </SettingsStackRow>

      <SettingsStackRow label="Model Identifier">
        <AppInput
          value={modelIdentifierInput}
          onChangeText={onChangeModelIdentifierInput}
          placeholder="anthropic/claude-haiku-4.5"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flexInput: {
    flex: 1,
  },
  input: {
    minHeight: 28,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  iconButton: {
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});
