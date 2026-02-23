import { StyleSheet } from 'react-native';
import {
  DEFAULT_OPENROUTER_SYSTEM_PROMPT,
} from '@application/services/openrouter-assistant-agent';
import { AppInput, SettingsSection, SettingsStackRow } from '@interface/ui/system';

type GenerationDefaultsSectionProps = {
  readonly temperatureInput: string;
  readonly onChangeTemperatureInput: (value: string) => void;
  readonly maxTokensInput: string;
  readonly onChangeMaxTokensInput: (value: string) => void;
  readonly systemPromptInput: string;
  readonly onChangeSystemPromptInput: (value: string) => void;
};

export const GenerationDefaultsSection = ({
  temperatureInput,
  onChangeTemperatureInput,
  maxTokensInput,
  onChangeMaxTokensInput,
  systemPromptInput,
  onChangeSystemPromptInput,
}: GenerationDefaultsSectionProps) => {
  return (
    <SettingsSection title="Generation Defaults">
      <SettingsStackRow label="Temperature (0.0 - 2.0)">
        <AppInput
          value={temperatureInput}
          onChangeText={onChangeTemperatureInput}
          placeholder="1.0"
          keyboardType="decimal-pad"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>

      <SettingsStackRow label="Max Tokens (optional)">
        <AppInput
          value={maxTokensInput}
          onChangeText={onChangeMaxTokensInput}
          placeholder="Leave blank for provider default"
          keyboardType="number-pad"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>

      <SettingsStackRow label="System Prompt">
        <AppInput
          value={systemPromptInput}
          onChangeText={onChangeSystemPromptInput}
          placeholder={DEFAULT_OPENROUTER_SYSTEM_PROMPT}
          autoCapitalize="sentences"
          autoCorrect={false}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multilineInput]}
        />
      </SettingsStackRow>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
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
  multilineInput: {
    minHeight: 92,
  },
});
