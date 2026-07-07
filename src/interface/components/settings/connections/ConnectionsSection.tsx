import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AppInput,
  AppText,
  SettingsSection,
  SettingsStackRow,
  SettingsSwitchRow,
} from '@/interface/ui/value-objects';
import type { useConnectionsController } from './useConnectionsController';

type ConnectionsSectionProps = {
  readonly controller: ReturnType<typeof useConnectionsController>;
  readonly switchOffTrack: string;
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly secondary: string;
  };
};

const STATUS_COLORS = {
  connected: '#34C759',
  disconnected: '#FF3B30',
} as const;

/**
 * Provider connections: OpenRouter API key and the LM Studio server.
 * Model + generation configuration intentionally live on Agents instead.
 */
export const ConnectionsSection = ({
  controller,
  switchOffTrack,
  colors,
}: ConnectionsSectionProps) => {
  const status = controller.lmstudioConnectionStatus;
  const statusColor =
    status === 'connected'
      ? STATUS_COLORS.connected
      : status === 'disconnected'
        ? STATUS_COLORS.disconnected
        : colors.line;
  const statusText =
    status === 'connected'
      ? 'Connected'
      : status === 'disconnected'
        ? 'Not reachable'
        : status === 'checking'
          ? 'Checking…'
          : 'Untested';

  return (
    <>
      <SettingsSection title="OpenRouter" footer={controller.apiKeyStatusText}>
        <SettingsStackRow label="API Key">
          <View style={styles.inputRow}>
            <AppInput
              value={controller.apiKeyInput}
              onChangeText={controller.setApiKeyInput}
              placeholder="sk-or-..."
              secureTextEntry={!controller.showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.flexInput]}
            />
            <Pressable
              onPress={() => controller.setShowApiKey((visible) => !visible)}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: colors.line, opacity: pressed ? 0.65 : 1 },
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

      <SettingsSection
        title="LM Studio"
        footer="Connect to your LM Studio server for local inference with MCP tool support. Models are picked when you create an agent."
      >
        <SettingsStackRow label="Server Address">
          <View style={styles.inputRow}>
            <AppInput
              value={controller.lmstudioEndpointInput}
              onChangeText={controller.setLmstudioEndpointInput}
              placeholder="http://localhost:1234"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.input, styles.flexInput]}
            />
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
          </View>
        </SettingsStackRow>

        <SettingsStackRow label="API Token (optional)">
          <View style={styles.inputRow}>
            <AppInput
              value={controller.lmstudioApiTokenInput}
              onChangeText={controller.setLmstudioApiTokenInput}
              placeholder="Leave blank if not required"
              secureTextEntry={!controller.showLmstudioToken}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.flexInput]}
            />
            <Pressable
              onPress={() =>
                controller.setShowLmstudioToken((visible) => !visible)
              }
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: colors.line, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons
                name={
                  controller.showLmstudioToken
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={16}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </SettingsStackRow>

        <SettingsSwitchRow
          label="Enable MCP Tools"
          value={controller.lmstudioUseMcpTools}
          onValueChange={controller.setLmstudioUseMcpTools}
          trackColor={{ false: switchOffTrack, true: colors.primary }}
        />

        <SettingsSwitchRow
          label="Auto-load Models"
          value={controller.lmstudioAutoLoadModels}
          onValueChange={controller.setLmstudioAutoLoadModels}
          trackColor={{ false: switchOffTrack, true: colors.primary }}
        />

        <View style={styles.statusRow}>
          <AppText variant="meta" style={{ color: colors.secondary }}>
            Status: {statusText}
          </AppText>
          <Pressable
            onPress={controller.testLmstudioConnection}
            disabled={status === 'checking'}
            style={({ pressed }) => [
              styles.testButton,
              {
                borderColor: colors.line,
                opacity: pressed || status === 'checking' ? 0.65 : 1,
              },
            ]}
          >
            {status === 'checking' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText variant="meta" style={{ color: colors.primary }}>
                Test connection
              </AppText>
            )}
          </Pressable>
        </View>
      </SettingsSection>
    </>
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  testButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    minWidth: 110,
    alignItems: 'center',
  },
});
