import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  DEFAULT_OPENROUTER_SYSTEM_PROMPT,
  findOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
  upsertOpenRouterAssistantAgent,
} from '@application/services/openrouter-assistant-agent';
import database from '@infrastructure/persistence/watermelon/index.native';
import {
  WatermelonAgentRepository,
  WatermelonUserPreferencesRepository,
} from '@infrastructure/persistence/watermelon/repositories';
import { ExpoSecureCredentialStore } from '@infrastructure/security';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  AppInput,
  AppScreen,
  AppText,
  SettingsInlineRow,
  SettingsList,
  SettingsSection,
  SettingsStackRow,
} from '../ui/system';

type SettingsDraft = {
  readonly apiKeyInput: string;
  readonly modelIdentifierInput: string;
  readonly systemPromptInput: string;
  readonly temperatureInput: string;
  readonly maxTokensInput: string;
  readonly verboseErrorAlerts: boolean;
};

const toDraftKey = (draft: SettingsDraft): string => JSON.stringify(draft);

const buildDraft = (input: {
  readonly apiKeyInput: string;
  readonly modelIdentifierInput: string;
  readonly systemPromptInput: string;
  readonly temperatureInput: string;
  readonly maxTokensInput: string;
  readonly verboseErrorAlerts: boolean;
}): SettingsDraft => ({
  apiKeyInput: input.apiKeyInput,
  modelIdentifierInput: input.modelIdentifierInput,
  systemPromptInput: input.systemPromptInput,
  temperatureInput: input.temperatureInput,
  maxTokensInput: input.maxTokensInput,
  verboseErrorAlerts: input.verboseErrorAlerts,
});

const SettingsView = () => {
  const { colors, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const repos = useMemo(
    () => ({
      agentRepo: new WatermelonAgentRepository(database),
      userPreferencesRepo: new WatermelonUserPreferencesRepository(database),
    }),
    []
  );
  const credentialStore = useMemo(() => new ExpoSecureCredentialStore(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lastSavedDraftKeyRef = useRef<string | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelIdentifierInput, setModelIdentifierInput] = useState(
    DEFAULT_OPENROUTER_MODEL_IDENTIFIER
  );
  const [systemPromptInput, setSystemPromptInput] = useState(
    DEFAULT_OPENROUTER_SYSTEM_PROMPT
  );
  const [temperatureInput, setTemperatureInput] = useState('1.0');
  const [maxTokensInput, setMaxTokensInput] = useState('');
  const [verboseErrorAlerts, setVerboseErrorAlerts] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const [userPreferences, openRouterAgent, storedApiKey] =
        await Promise.all([
          repos.userPreferencesRepo.get(),
          findOpenRouterAssistantAgent(repos.agentRepo),
          credentialStore.getProviderApiKey('openrouter'),
        ]);

      const modelIdentifier =
        getOpenRouterModelIdentifier(openRouterAgent) ??
        DEFAULT_OPENROUTER_MODEL_IDENTIFIER;
      const temperature =
        openRouterAgent?.configuration.temperature ??
        userPreferences.defaultTemperature;
      const maxTokens = openRouterAgent?.configuration.maxTokens;
      const systemPrompt =
        openRouterAgent?.configuration.systemPrompt ??
        DEFAULT_OPENROUTER_SYSTEM_PROMPT;

      const loadedDraft = buildDraft({
        apiKeyInput: storedApiKey?.trim() ?? '',
        modelIdentifierInput: modelIdentifier,
        systemPromptInput: systemPrompt,
        temperatureInput: String(temperature),
        maxTokensInput:
          typeof maxTokens === 'number' && Number.isFinite(maxTokens)
            ? String(maxTokens)
            : '',
        verboseErrorAlerts: userPreferences.verboseErrorAlerts,
      });

      setApiKeyInput(loadedDraft.apiKeyInput);
      setHasStoredApiKey(loadedDraft.apiKeyInput.length > 0);
      setModelIdentifierInput(loadedDraft.modelIdentifierInput);
      setSystemPromptInput(loadedDraft.systemPromptInput);
      setTemperatureInput(loadedDraft.temperatureInput);
      setMaxTokensInput(loadedDraft.maxTokensInput);
      setVerboseErrorAlerts(loadedDraft.verboseErrorAlerts);
      lastSavedDraftKeyRef.current = toDraftKey(loadedDraft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [credentialStore, repos.agentRepo, repos.userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return undefined;
    }, [loadSettings])
  );

  const persistDraft = useCallback(
    async (draft: SettingsDraft): Promise<void> => {
      const modelIdentifier = draft.modelIdentifierInput.trim();
      const parsedTemperature = Number(
        draft.temperatureInput.replace(',', '.').trim()
      );
      const maxTokensRaw = draft.maxTokensInput.trim();
      const normalizedApiKey = draft.apiKeyInput.trim();
      const normalizedSystemPrompt = draft.systemPromptInput.trim();

      if (!modelIdentifier) {
        setError('Model identifier is required.');
        return;
      }

      if (
        !Number.isFinite(parsedTemperature) ||
        parsedTemperature < 0 ||
        parsedTemperature > 2
      ) {
        setError('Temperature must be a number between 0.0 and 2.0.');
        return;
      }

      let parsedMaxTokens: number | undefined;
      if (maxTokensRaw.length > 0) {
        const maxTokens = Number(maxTokensRaw);
        if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
          setError('Max tokens must be a positive whole number.');
          return;
        }
        parsedMaxTokens = maxTokens;
      }

      setSaving(true);
      setError(null);
      setNotice(null);

      try {
        await Promise.all([
          repos.userPreferencesRepo.update({
            defaultTemperature: parsedTemperature,
            verboseErrorAlerts: draft.verboseErrorAlerts,
          }),
          upsertOpenRouterAssistantAgent(repos.agentRepo, {
            modelIdentifier,
            temperature: parsedTemperature,
            maxTokens: parsedMaxTokens,
            systemPrompt: normalizedSystemPrompt,
          }),
          normalizedApiKey.length > 0
            ? credentialStore.setProviderApiKey('openrouter', normalizedApiKey)
            : credentialStore.deleteProviderApiKey('openrouter'),
        ]);

        const normalizedDraft = buildDraft({
          ...draft,
          apiKeyInput: normalizedApiKey,
          modelIdentifierInput: modelIdentifier,
          systemPromptInput: normalizedSystemPrompt,
        });
        lastSavedDraftKeyRef.current = toDraftKey(normalizedDraft);
        setHasStoredApiKey(normalizedApiKey.length > 0);
        setApiKeyInput(normalizedApiKey);
        setModelIdentifierInput(modelIdentifier);
        setSystemPromptInput(normalizedSystemPrompt);
        setNotice('All changes saved.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSaving(false);
      }
    },
    [credentialStore, repos.agentRepo, repos.userPreferencesRepo]
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    const draft = buildDraft({
      apiKeyInput,
      modelIdentifierInput,
      systemPromptInput,
      temperatureInput,
      maxTokensInput,
      verboseErrorAlerts,
    });
    const draftKey = toDraftKey(draft);
    if (draftKey === lastSavedDraftKeyRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void persistDraft(draft);
    }, 450);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    apiKeyInput,
    loading,
    maxTokensInput,
    modelIdentifierInput,
    persistDraft,
    systemPromptInput,
    temperatureInput,
    verboseErrorAlerts,
  ]);

  const modelIdentifier = modelIdentifierInput.trim();
  const parsedTemperature = Number(temperatureInput.replace(',', '.').trim());
  const maxTokensRaw = maxTokensInput.trim();
  const hasValidModel = modelIdentifier.length > 0;
  const hasValidTemperature =
    Number.isFinite(parsedTemperature) &&
    parsedTemperature >= 0 &&
    parsedTemperature <= 2;
  const hasValidMaxTokens =
    maxTokensRaw.length === 0 ||
    (Number.isInteger(Number(maxTokensRaw)) && Number(maxTokensRaw) > 0);
  const hasValidationError =
    !hasValidModel || !hasValidTemperature || !hasValidMaxTokens;

  const apiKeyStatusText = hasStoredApiKey
    ? 'Stored securely. Clear this field to remove.'
    : 'No key currently stored.';

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <AppScreen>
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          enabled
          bottomOffset={Platform.OS === 'ios' ? 62 : 0}
          extraKeyboardSpace={0}
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
        >
          <SettingsList>
            <SettingsSection title="OpenRouter" footer={apiKeyStatusText}>
              <SettingsStackRow label="API Key">
                <View style={styles.inputRow}>
                  <AppInput
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    placeholder="sk-or-..."
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, styles.flexInput]}
                  />
                  <Pressable
                    onPress={() => setShowApiKey((visible) => !visible)}
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
                  onChangeText={setModelIdentifierInput}
                  placeholder="anthropic/claude-haiku-4.5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </SettingsStackRow>

              <SettingsStackRow label="System Prompt">
                <AppInput
                  value={systemPromptInput}
                  onChangeText={setSystemPromptInput}
                  placeholder={DEFAULT_OPENROUTER_SYSTEM_PROMPT}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.multilineInput]}
                />
              </SettingsStackRow>
            </SettingsSection>

            <SettingsSection title="Generation Defaults">
              <SettingsStackRow label="Temperature (0.0 - 2.0)">
                <AppInput
                  value={temperatureInput}
                  onChangeText={setTemperatureInput}
                  placeholder="1.0"
                  keyboardType="decimal-pad"
                  autoCorrect={false}
                  style={styles.input}
                />
              </SettingsStackRow>

              <SettingsStackRow label="Max Tokens (optional)">
                <AppInput
                  value={maxTokensInput}
                  onChangeText={setMaxTokensInput}
                  placeholder="Leave blank for provider default"
                  keyboardType="number-pad"
                  autoCorrect={false}
                  style={styles.input}
                />
              </SettingsStackRow>
            </SettingsSection>

            <SettingsSection
              title="App Behavior"
              footer="Show detailed provider failures in UI."
            >
              <SettingsInlineRow
                label="Verbose Error Alerts"
                trailing={
                  <Switch
                    value={verboseErrorAlerts}
                    onValueChange={setVerboseErrorAlerts}
                    trackColor={{
                      false: switchOffTrack,
                      true: colors.red,
                    }}
                    thumbColor={colors.onSurface}
                  />
                }
              />
            </SettingsSection>

            {saving ? (
              <AppText variant="meta" tone="secondary" style={styles.statusText}>
                Saving changes...
              </AppText>
            ) : null}

            {notice && !hasValidationError ? (
              <AppText variant="meta" tone="secondary" style={styles.statusText}>
                {notice}
              </AppText>
            ) : null}

            {error ? (
              <AppText variant="meta" tone="accent" style={styles.statusText}>
                {error}
              </AppText>
            ) : null}
          </SettingsList>
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'ios' && !loading ? (
        <KeyboardToolbar insets={{ left: insets.left, right: insets.right }}>
          <KeyboardToolbar.Prev />
          <KeyboardToolbar.Next />
          <KeyboardToolbar.Done text="Close" />
        </KeyboardToolbar>
      ) : null}
    </AppScreen>
  );
};

export default SettingsView;

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
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
  multilineInput: {
    minHeight: 92,
  },
  iconButton: {
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  statusText: {
    marginLeft: 4,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 18,
    fontStyle: 'italic',
  },
});
