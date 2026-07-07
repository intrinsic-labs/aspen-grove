import { StyleSheet } from 'react-native';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@application/services/agent-defaults';
import { AppInput, SettingsStackRow } from '@/interface/ui/value-objects';

type AgentConfigFieldsProps = {
  readonly name: string;
  readonly onChangeName: (value: string) => void;
  readonly temperatureInput: string;
  readonly onChangeTemperatureInput: (value: string) => void;
  readonly maxTokensInput: string;
  readonly onChangeMaxTokensInput: (value: string) => void;
  readonly systemPrompt: string;
  readonly onChangeSystemPrompt: (value: string) => void;
};

/**
 * The generation-config form fields shared by the Settings agent editor and
 * the chat-side dialogue settings sheet. Model selection is separate (see
 * ModelPickerField) because the chat sheet sometimes shows config without
 * allowing a model switch.
 */
export const AgentConfigFields = ({
  name,
  onChangeName,
  temperatureInput,
  onChangeTemperatureInput,
  maxTokensInput,
  onChangeMaxTokensInput,
  systemPrompt,
  onChangeSystemPrompt,
}: AgentConfigFieldsProps) => {
  return (
    <>
      <SettingsStackRow label="Name">
        <AppInput
          value={name}
          onChangeText={onChangeName}
          placeholder="e.g. Claude (Creative)"
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>

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
          value={systemPrompt}
          onChangeText={onChangeSystemPrompt}
          placeholder={DEFAULT_AGENT_SYSTEM_PROMPT}
          autoCapitalize="sentences"
          autoCorrect={false}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multilineInput]}
        />
      </SettingsStackRow>
    </>
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
