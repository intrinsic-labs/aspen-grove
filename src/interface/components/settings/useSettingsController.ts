import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  DEFAULT_OPENROUTER_SYSTEM_PROMPT,
  findOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
  upsertOpenRouterAssistantAgent,
} from '@application/services/openrouter-assistant-agent';
import { useAppServices } from '@interface/composition';
import type { SettingsDraft } from './types';

const toDraftKey = (draft: SettingsDraft): string => JSON.stringify(draft);

const buildDraft = (input: SettingsDraft): SettingsDraft => ({
  apiKeyInput: input.apiKeyInput,
  modelIdentifierInput: input.modelIdentifierInput,
  systemPromptInput: input.systemPromptInput,
  temperatureInput: input.temperatureInput,
  maxTokensInput: input.maxTokensInput,
  verboseErrorAlerts: input.verboseErrorAlerts,
});

export const useSettingsController = () => {
  const { repositories, adapters } = useAppServices();

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

      const [userPreferences, openRouterAgent, storedApiKey] = await Promise.all([
        repositories.userPreferencesRepo.get(),
        findOpenRouterAssistantAgent(repositories.agentRepo),
        adapters.credentialStore.getProviderApiKey('openrouter'),
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
  }, [adapters.credentialStore, repositories.agentRepo, repositories.userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return undefined;
    }, [loadSettings])
  );

  const persistDraft = useCallback(
    async (draft: SettingsDraft): Promise<void> => {
      const modelIdentifier = draft.modelIdentifierInput.trim();
      const parsedTemperature = Number(draft.temperatureInput.replace(',', '.').trim());
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
          repositories.userPreferencesRepo.update({
            defaultTemperature: parsedTemperature,
            verboseErrorAlerts: draft.verboseErrorAlerts,
          }),
          upsertOpenRouterAssistantAgent(repositories.agentRepo, {
            modelIdentifier,
            temperature: parsedTemperature,
            maxTokens: parsedMaxTokens,
            systemPrompt: normalizedSystemPrompt,
          }),
          normalizedApiKey.length > 0
            ? adapters.credentialStore.setProviderApiKey('openrouter', normalizedApiKey)
            : adapters.credentialStore.deleteProviderApiKey('openrouter'),
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
    [adapters.credentialStore, repositories.agentRepo, repositories.userPreferencesRepo]
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

  return {
    loading,
    saving,
    error,
    notice,
    hasValidationError,
    apiKeyStatusText,
    apiKeyInput,
    setApiKeyInput,
    hasStoredApiKey,
    showApiKey,
    setShowApiKey,
    modelIdentifierInput,
    setModelIdentifierInput,
    systemPromptInput,
    setSystemPromptInput,
    temperatureInput,
    setTemperatureInput,
    maxTokensInput,
    setMaxTokensInput,
    verboseErrorAlerts,
    setVerboseErrorAlerts,
  };
};

