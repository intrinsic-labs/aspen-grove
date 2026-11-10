import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import {
  AppInput,
  AppText,
  SettingsSection,
  SettingsStackRow,
  SettingsSwitchRow,
} from '@/interface/ui/value-objects';
import { connectionStyles } from './connection-styles';
import type {
  ConnectionsController,
  LmStudioConnectionStatus,
} from './useConnectionsController';

const STATUS_TEXT: Record<LmStudioConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Not reachable',
  checking: 'Checking…',
  idle: 'Untested',
};

type LmStudioConnectionSectionProps = {
  readonly controller: ConnectionsController;
  /** Show the optional token and auto-load rows. Onboarding hides them. */
  readonly showAdvanced?: boolean;
  readonly footer?: string;
};

/**
 * The LM Studio server: address, optional token, auto-load, and a
 * connection test whose failure is explained in plain words.
 */
export const LmStudioConnectionSection = ({
  controller,
  showAdvanced = true,
  footer,
}: LmStudioConnectionSectionProps) => {
  const { colors } = useAspenGroveTheme();
  const status = controller.lmstudioConnectionStatus;
  const statusColor =
    status === 'connected'
      ? colors.green
      : status === 'disconnected'
        ? colors.red
        : colors.line;

  return (
    <SettingsSection
      testID="connections-lmstudio"
      title="LM Studio"
      footer={
        footer ??
        'Connect to your LM Studio server for local inference. Models are picked when you create an agent.'
      }
    >
      <SettingsStackRow label="Server Address">
        <View style={connectionStyles.inputRow}>
          <AppInput
            testID="connections-lmstudio-endpoint-input"
            value={controller.lmstudioEndpointInput}
            onChangeText={controller.setLmstudioEndpointInput}
            placeholder="http://localhost:1234"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[connectionStyles.input, connectionStyles.flexInput]}
          />
          <View
            testID="connections-lmstudio-status-dot"
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
        </View>
      </SettingsStackRow>

      {showAdvanced ? (
        <SettingsStackRow label="API Token (optional)">
          <View style={connectionStyles.inputRow}>
            <AppInput
              testID="connections-lmstudio-token-input"
              value={controller.lmstudioApiTokenInput}
              onChangeText={controller.setLmstudioApiTokenInput}
              placeholder="Leave blank if not required"
              secureTextEntry={!controller.showLmstudioToken}
              autoCapitalize="none"
              autoCorrect={false}
              style={[connectionStyles.input, connectionStyles.flexInput]}
            />
            <Pressable
              testID="connections-lmstudio-token-reveal"
              onPress={() =>
                controller.setShowLmstudioToken((visible) => !visible)
              }
              accessibilityLabel={
                controller.showLmstudioToken ? 'Hide token' : 'Show token'
              }
              style={({ pressed }) => [
                connectionStyles.iconButton,
                { opacity: pressed ? 0.65 : 1 },
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
      ) : null}

      {showAdvanced ? (
        <SettingsSwitchRow
          testID="connections-lmstudio-auto-load"
          label="Auto-load Models"
          value={controller.lmstudioAutoLoadModels}
          onValueChange={controller.setLmstudioAutoLoadModels}
        />
      ) : null}

      <View>
        <View style={styles.statusRow}>
          <AppText
            testID="connections-lmstudio-status"
            variant="meta"
            tone="secondary"
          >
            Status: {STATUS_TEXT[status]}
          </AppText>
          <Pressable
            testID="connections-lmstudio-test"
            onPress={controller.testLmstudioConnection}
            disabled={status === 'checking'}
            hitSlop={6}
            style={({ pressed }) => [
              styles.testButton,
              { opacity: pressed || status === 'checking' ? 0.65 : 1 },
            ]}
          >
            {status === 'checking' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText variant="meta" tone="accent">
                {status === 'disconnected' ? 'Test again' : 'Test connection'}
              </AppText>
            )}
          </Pressable>
        </View>
        {status === 'disconnected' && controller.lmstudioConnectionError ? (
          <AppText
            testID="connections-lmstudio-error"
            variant="meta"
            tone="accent"
            style={styles.errorText}
          >
            {controller.lmstudioConnectionError}
          </AppText>
        ) : null}
      </View>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
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
    paddingVertical: 10,
  },
  testButton: {
    minWidth: 110,
    alignItems: 'flex-end',
  },
  errorText: {
    paddingBottom: 10,
  },
});
