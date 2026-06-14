import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { LMStudioModel } from '@infrastructure/llm';
import {
  AppInput,
  AppText,
  SettingsSection,
  SettingsStackRow,
  SettingsSwitchRow,
} from '@/interface/ui/value-objects';

type LMStudioSettingsSectionProps = {
  readonly endpointInput: string;
  readonly onChangeEndpointInput: (value: string) => void;
  readonly apiTokenInput: string;
  readonly onChangeApiTokenInput: (value: string) => void;
  readonly showApiToken: boolean;
  readonly onToggleShowApiToken: () => void;
  readonly useMcpTools: boolean;
  readonly onChangeUseMcpTools: (value: boolean) => void;
  readonly autoLoadModels: boolean;
  readonly onChangeAutoLoadModels: (value: boolean) => void;
  readonly selectedModel: string;
  readonly onChangeSelectedModel: (value: string) => void;
  readonly models: LMStudioModel[];
  readonly modelsLoading: boolean;
  readonly modelsError: string | null;
  readonly onRefreshModels: () => void;
  readonly connectionStatus: 'connected' | 'disconnected' | 'checking';
  readonly switchOffTrack: string;
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly success: string;
    readonly error: string;
    readonly muted: string;
  };
};

export const LMStudioSettingsSection = ({
  endpointInput,
  onChangeEndpointInput,
  apiTokenInput,
  onChangeApiTokenInput,
  showApiToken,
  onToggleShowApiToken,
  useMcpTools,
  onChangeUseMcpTools,
  autoLoadModels,
  onChangeAutoLoadModels,
  selectedModel,
  onChangeSelectedModel,
  models,
  modelsLoading,
  modelsError,
  onRefreshModels,
  connectionStatus,
  switchOffTrack,
  colors,
}: LMStudioSettingsSectionProps) => {
  const statusColor =
    connectionStatus === 'connected'
      ? colors.success
      : connectionStatus === 'disconnected'
        ? colors.error
        : colors.muted;

  const statusText =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'disconnected'
        ? 'Disconnected'
        : 'Checking...';

  return (
    <SettingsSection
      title="LM Studio"
      footer="Connect to your local LM Studio server for private, on-device inference with MCP tool support."
    >
      <SettingsStackRow label="Server Address">
        <View style={styles.inputRow}>
          <AppInput
            value={endpointInput}
            onChangeText={onChangeEndpointInput}
            placeholder="http://localhost:1234"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, styles.flexInput]}
          />
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </SettingsStackRow>

      <SettingsStackRow label="API Token (optional)">
        <View style={styles.inputRow}>
          <AppInput
            value={apiTokenInput}
            onChangeText={onChangeApiTokenInput}
            placeholder="Leave blank if not required"
            secureTextEntry={!showApiToken}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.flexInput]}
          />
          <Pressable
            onPress={onToggleShowApiToken}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: colors.line,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons
              name={showApiToken ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        </View>
      </SettingsStackRow>

      <SettingsStackRow label="Model">
        <View style={styles.modelRow}>
          {modelsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : modelsError ? (
            <AppText variant="meta" tone="accent">
              {modelsError}
            </AppText>
          ) : models.length === 0 ? (
            <AppText variant="meta" style={{ color: colors.muted }}>
              No models found
            </AppText>
          ) : (
            <View style={styles.modelList}>
              {models.map((model) => {
                const isSelected = model.id === selectedModel;
                const isLoaded = model.state === 'loaded';

                return (
                  <Pressable
                    key={model.id}
                    onPress={() => onChangeSelectedModel(model.id)}
                    style={({ pressed }) => [
                      styles.modelItem,
                      {
                        borderColor: isSelected ? colors.primary : colors.line,
                        backgroundColor: isSelected
                          ? `${colors.primary}15`
                          : 'transparent',
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <View style={styles.modelItemContent}>
                      <AppText
                        variant="body"
                        numberOfLines={1}
                        style={styles.modelName}
                      >
                        {model.displayName}
                      </AppText>
                      {isLoaded && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.success}
                          style={styles.loadedIcon}
                        />
                      )}
                    </View>
                    <AppText
                      variant="meta"
                      style={{ color: colors.muted, fontSize: 11 }}
                    >
                      {Math.round(model.maxContextLength / 1000)}K ctx
                      {model.paramsString ? ` · ${model.paramsString}` : ''}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Pressable
            onPress={onRefreshModels}
            disabled={modelsLoading}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: colors.line,
                opacity: pressed || modelsLoading ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </SettingsStackRow>

      <SettingsSwitchRow
        label="Enable MCP Tools"
        value={useMcpTools}
        onValueChange={onChangeUseMcpTools}
        trackColor={{ false: switchOffTrack, true: colors.primary }}
      />

      <SettingsSwitchRow
        label="Auto-load Models"
        value={autoLoadModels}
        onValueChange={onChangeAutoLoadModels}
        trackColor={{ false: switchOffTrack, true: colors.primary }}
      />

      <View style={styles.statusRow}>
        <AppText variant="meta" style={{ color: colors.muted }}>
          Status: {statusText}
        </AppText>
      </View>
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  modelList: {
    flex: 1,
    gap: 6,
  },
  modelItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  modelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelName: {
    flex: 1,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
  },
  loadedIcon: {
    marginLeft: 6,
  },
  statusRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
