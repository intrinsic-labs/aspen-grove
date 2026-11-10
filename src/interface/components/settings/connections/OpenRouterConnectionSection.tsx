import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import {
  AppInput,
  SettingsSection,
  SettingsStackRow,
} from '@/interface/ui/value-objects';
import { connectionStyles } from './connection-styles';
import type { ConnectionsController } from './useConnectionsController';

type OpenRouterConnectionSectionProps = {
  readonly controller: ConnectionsController;
  readonly footer?: string;
};

/** The OpenRouter API key field (Settings → Connections and onboarding). */
export const OpenRouterConnectionSection = ({
  controller,
  footer,
}: OpenRouterConnectionSectionProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <SettingsSection
      testID="connections-openrouter"
      title="OpenRouter"
      footer={footer ?? controller.apiKeyStatusText}
    >
      <SettingsStackRow label="API Key">
        <View style={connectionStyles.inputRow}>
          <AppInput
            testID="connections-openrouter-key-input"
            value={controller.apiKeyInput}
            onChangeText={controller.setApiKeyInput}
            placeholder="sk-or-..."
            secureTextEntry={!controller.showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            style={[connectionStyles.input, connectionStyles.flexInput]}
          />
          <Pressable
            testID="connections-openrouter-key-reveal"
            onPress={() => controller.setShowApiKey((visible) => !visible)}
            accessibilityLabel={controller.showApiKey ? 'Hide key' : 'Show key'}
            style={({ pressed }) => [
              connectionStyles.iconButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons
              name={controller.showApiKey ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        </View>
      </SettingsStackRow>
    </SettingsSection>
  );
};

