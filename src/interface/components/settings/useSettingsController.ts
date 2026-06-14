import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type {
  FontSize,
  NodeViewStyle,
  SelectableProvider,
} from '@domain/entities';
import { DEFAULT_LMSTUDIO_SETTINGS } from '@domain/entities';
import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  DEFAULT_OPENROUTER_SYSTEM_PROMPT,
  findOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
  upsertOpenRouterAssistantAgent,
} from '@application/services/openrouter-assistant-agent';
import type { LMStudioModel } from '@infrastructure/llm';
import { useAppServices } from '@interface/composition';
import type { ChatFontFace, SettingsDraft } from './types';

const SUPPORTED_CHAT_FONT_FACES: readonly ChatFontFace[] = [
  'Cardo-Regular',
  'IBMPlexMono-Regular',
  'OpenSans-Regular',
];
const DEFAULT_CHAT_FONT_FACE: ChatFontFace = 'Cardo-Regular';
const MIN_CHAT_FONT_SIZE = 12;
const MAX_CHAT_FONT_SIZE = 30;
const MIN_NODE_CORNER_RADIUS = 0;
const MAX_NODE_CORNER_RADIUS = 32;

const toChatFontFace = (value?: string): ChatFontFace =>
  SUPPORTED_CHAT_FONT_FACES.includes(value as ChatFontFace)
    ? (value as ChatFontFace)
    : DEFAULT_CHAT_FONT_FACE;

const toDraftKey = (draft: SettingsDraft): string => JSON.stringify(draft);

const buildDraft = (input: SettingsDraft): SettingsDraft => ({
  selectedProvider: input.selectedProvider,
  apiKeyInput: input.apiKeyInput,
  modelIdentifierInput: input.modelIdentifierInput,
  lmstudioEndpointInput: input.lmstudioEndpointInput,
  lmstudioApiTokenInput: input.lmstudioApiTokenInput,
  lmstudioUseMcpTools: input.lmstudioUseMcpTools,
  lmstudioAutoLoadModels: input.lmstudioAutoLoadModels,
  lmstudioSelectedModel: input.lmstudioSelectedModel,
  systemPromptInput: input.systemPromptInput,
  temperatureInput: input.temperatureInput,
  maxTokensInput: input.maxTokensInput,
  verboseErrorAlerts: input.verboseErrorAlerts,
  fontFace: input.fontFace,
  fontSizeInput: input.fontSizeInput,
  nodeViewStyle: input.nodeViewStyle,
  nodeViewCornerRadiusInput: input.nodeViewCornerRadiusInput,
});

export const useSettingsController = () => {
  const { repositories, adapters } = useAppServices();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lastSavedDraftKeyRef = useRef<string | null>(null);

  // Provider selection
  const [selectedProvider, setSelectedProvider] =
    useState<SelectableProvider>('openrouter');

  // OpenRouter settings
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelIdentifierInput, setModelIdentifierInput] = useState(
    DEFAULT_OPENROUTER_MODEL_IDENTIFIER
  );

  // LM Studio settings
  const [lmstudioEndpointInput, setLmstudioEndpointInput] = useState(
    DEFAULT_LMSTUDIO_SETTINGS.endpoint
  );
  const [lmstudioApiTokenInput, setLmstudioApiTokenInput] = useState('');
  const [hasStoredLmstudioToken, setHasStoredLmstudioToken] = useState(false);
  const [showLmstudioToken, setShowLmstudioToken] = useState(false);
  const [lmstudioUseMcpTools, setLmstudioUseMcpTools] = useState(
    DEFAULT_LMSTUDIO_SETTINGS.useMcpTools
  );
  const [lmstudioAutoLoadModels, setLmstudioAutoLoadModels] = useState(
    DEFAULT_LMSTUDIO_SETTINGS.autoLoadModels
  );
  const [lmstudioSelectedModel, setLmstudioSelectedModel] = useState('');
  const [lmstudioModels, setLmstudioModels] = useState<LMStudioModel[]>([]);
  const [lmstudioModelsLoading, setLmstudioModelsLoading] = useState(false);
  const [lmstudioModelsError, setLmstudioModelsError] = useState<string | null>(
    null
  );
  const [lmstudioConnectionStatus, setLmstudioConnectionStatus] = useState<
    'connected' | 'disconnected' | 'checking'
  >('checking');

  // Generation defaults
  const [systemPromptInput, setSystemPromptInput] = useState(
    DEFAULT_OPENROUTER_SYSTEM_PROMPT
  );
  const [temperatureInput, setTemperatureInput] = useState('1.0');
  const [maxTokensInput, setMaxTokensInput] = useState('');

  // App behavior
  const [verboseErrorAlerts, setVerboseErrorAlerts] = useState(false);

  // Typography
  const [fontFace, setFontFace] = useState<ChatFontFace>(
    DEFAULT_CHAT_FONT_FACE
  );
  const [fontSizeInput, setFontSizeInput] = useState('17');
  const [nodeViewStyle, setNodeViewStyle] = useState<NodeViewStyle>('filled');
  const [nodeViewCornerRadiusInput, setNodeViewCornerRadiusInput] =
    useState('8');

  // Fetch LM Studio models
  const fetchLmstudioModels = useCallback(async () => {
    console.log('[Settings:LMStudio] fetchLmstudioModels called', {
      endpoint: lmstudioEndpointInput,
      hasToken: !!lmstudioApiTokenInput,
    });

    setLmstudioModelsLoading(true);
    setLmstudioModelsError(null);
    setLmstudioConnectionStatus('checking');

    try {
      const lmstudioAdapter = adapters.providerRegistry.getLMStudioAdapter();
      console.log('[Settings:LMStudio] Got adapter, initializing...');

      // Initialize with current settings
      await lmstudioAdapter.initialize(
        { apiKey: lmstudioApiTokenInput },
        { endpoint: lmstudioEndpointInput }
      );
      console.log('[Settings:LMStudio] Initialized, configuring...');

      lmstudioAdapter.configure({
        useMcpTools: lmstudioUseMcpTools,
        autoLoadModels: lmstudioAutoLoadModels,
      });

      const models = await lmstudioAdapter.fetchModels();
      setLmstudioModels(models);
      setLmstudioConnectionStatus('connected');

      // Auto-select first loaded model if none selected
      if (!lmstudioSelectedModel && models.length > 0) {
        const loadedModel = models.find((m) => m.state === 'loaded');
        setLmstudioSelectedModel(loadedModel?.id ?? models[0].id);
      }
    } catch (caught) {
      setLmstudioModelsError(
        caught instanceof Error ? caught.message : 'Failed to fetch models'
      );
      setLmstudioConnectionStatus('disconnected');
      setLmstudioModels([]);
    } finally {
      setLmstudioModelsLoading(false);
    }
  }, [
    adapters.providerRegistry,
    lmstudioApiTokenInput,
    lmstudioAutoLoadModels,
    lmstudioEndpointInput,
    lmstudioSelectedModel,
    lmstudioUseMcpTools,
  ]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const [
        userPreferences,
        openRouterAgent,
        storedOpenRouterKey,
        storedLmstudioToken,
      ] = await Promise.all([
        repositories.userPreferencesRepo.get(),
        findOpenRouterAssistantAgent(repositories.agentRepo),
        adapters.credentialStore.getProviderApiKey('openrouter'),
        adapters.credentialStore.getProviderApiKey('lmstudio'),
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

      const lmSettings = userPreferences.lmstudioSettings;

      const loadedDraft = buildDraft({
        selectedProvider: userPreferences.selectedProvider,
        apiKeyInput: storedOpenRouterKey?.trim() ?? '',
        modelIdentifierInput: modelIdentifier,
        lmstudioEndpointInput: lmSettings.endpoint,
        lmstudioApiTokenInput: storedLmstudioToken?.trim() ?? '',
        lmstudioUseMcpTools: lmSettings.useMcpTools,
        lmstudioAutoLoadModels: lmSettings.autoLoadModels,
        lmstudioSelectedModel: lmSettings.selectedModel ?? '',
        systemPromptInput: systemPrompt,
        temperatureInput: String(temperature),
        maxTokensInput:
          typeof maxTokens === 'number' && Number.isFinite(maxTokens)
            ? String(maxTokens)
            : '',
        verboseErrorAlerts: userPreferences.verboseErrorAlerts,
        fontFace: toChatFontFace(userPreferences.fontFace),
        fontSizeInput: String(userPreferences.fontSize),
        nodeViewStyle: userPreferences.nodeViewStyle,
        nodeViewCornerRadiusInput: String(userPreferences.nodeViewCornerRadius),
      });

      // Apply loaded values
      setSelectedProvider(loadedDraft.selectedProvider);
      setApiKeyInput(loadedDraft.apiKeyInput);
      setHasStoredApiKey(loadedDraft.apiKeyInput.length > 0);
      setModelIdentifierInput(loadedDraft.modelIdentifierInput);
      setLmstudioEndpointInput(loadedDraft.lmstudioEndpointInput);
      setLmstudioApiTokenInput(loadedDraft.lmstudioApiTokenInput);
      setHasStoredLmstudioToken(loadedDraft.lmstudioApiTokenInput.length > 0);
      setLmstudioUseMcpTools(loadedDraft.lmstudioUseMcpTools);
      setLmstudioAutoLoadModels(loadedDraft.lmstudioAutoLoadModels);
      setLmstudioSelectedModel(loadedDraft.lmstudioSelectedModel);
      setSystemPromptInput(loadedDraft.systemPromptInput);
      setTemperatureInput(loadedDraft.temperatureInput);
      setMaxTokensInput(loadedDraft.maxTokensInput);
      setVerboseErrorAlerts(loadedDraft.verboseErrorAlerts);
      setFontFace(loadedDraft.fontFace);
      setFontSizeInput(loadedDraft.fontSizeInput);
      setNodeViewStyle(loadedDraft.nodeViewStyle);
      setNodeViewCornerRadiusInput(loadedDraft.nodeViewCornerRadiusInput);

      // Update provider registry
      adapters.providerRegistry.setActiveProvider(loadedDraft.selectedProvider);

      lastSavedDraftKeyRef.current = toDraftKey(loadedDraft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [
    adapters.credentialStore,
    adapters.providerRegistry,
    repositories.agentRepo,
    repositories.userPreferencesRepo,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return undefined;
    }, [loadSettings])
  );

  // Fetch LM Studio models when settings are loaded or endpoint changes
  useEffect(() => {
    if (!loading && selectedProvider === 'lmstudio') {
      void fetchLmstudioModels();
    }
  }, [loading, selectedProvider, lmstudioEndpointInput, fetchLmstudioModels]);

  const persistDraft = useCallback(
    async (draft: SettingsDraft): Promise<void> => {
      const modelIdentifier = draft.modelIdentifierInput.trim();
      const parsedTemperature = Number(
        draft.temperatureInput.replace(',', '.').trim()
      );
      const maxTokensRaw = draft.maxTokensInput.trim();
      const normalizedApiKey = draft.apiKeyInput.trim();
      const normalizedLmstudioToken = draft.lmstudioApiTokenInput.trim();
      const normalizedSystemPrompt = draft.systemPromptInput.trim();
      const parsedFontSize = Number(draft.fontSizeInput.trim());
      const parsedNodeCornerRadius = Number(
        draft.nodeViewCornerRadiusInput.trim()
      );

      // Validation for OpenRouter
      if (draft.selectedProvider === 'openrouter' && !modelIdentifier) {
        setError('Model identifier is required for OpenRouter.');
        return;
      }

      // Validation for LM Studio
      if (
        draft.selectedProvider === 'lmstudio' &&
        !draft.lmstudioSelectedModel
      ) {
        setError('Please select a model from LM Studio.');
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

      if (!SUPPORTED_CHAT_FONT_FACES.includes(draft.fontFace)) {
        setError('Selected font is not supported.');
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

      if (
        !Number.isInteger(parsedFontSize) ||
        parsedFontSize < MIN_CHAT_FONT_SIZE ||
        parsedFontSize > MAX_CHAT_FONT_SIZE
      ) {
        setError(
          `Font size must be a whole number between ${MIN_CHAT_FONT_SIZE} and ${MAX_CHAT_FONT_SIZE}.`
        );
        return;
      }

      if (
        !Number.isInteger(parsedNodeCornerRadius) ||
        parsedNodeCornerRadius < MIN_NODE_CORNER_RADIUS ||
        parsedNodeCornerRadius > MAX_NODE_CORNER_RADIUS
      ) {
        setError(
          `Message corner radius must be a whole number between ${MIN_NODE_CORNER_RADIUS} and ${MAX_NODE_CORNER_RADIUS}.`
        );
        return;
      }

      setSaving(true);
      setError(null);
      setNotice(null);

      try {
        await Promise.all([
          // Update UserPreferences
          repositories.userPreferencesRepo.update({
            defaultTemperature: parsedTemperature,
            verboseErrorAlerts: draft.verboseErrorAlerts,
            fontFace: draft.fontFace,
            fontSize: parsedFontSize as FontSize,
            nodeViewStyle: draft.nodeViewStyle,
            nodeViewCornerRadius: parsedNodeCornerRadius,
            selectedProvider: draft.selectedProvider,
            lmstudioSettings: {
              endpoint: draft.lmstudioEndpointInput.trim(),
              useMcpTools: draft.lmstudioUseMcpTools,
              autoLoadModels: draft.lmstudioAutoLoadModels,
              selectedModel: draft.lmstudioSelectedModel || undefined,
            },
          }),
          // Update OpenRouter agent
          upsertOpenRouterAssistantAgent(repositories.agentRepo, {
            modelIdentifier,
            temperature: parsedTemperature,
            maxTokens: parsedMaxTokens,
            systemPrompt: normalizedSystemPrompt,
          }),
          // Update OpenRouter API key
          normalizedApiKey.length > 0
            ? adapters.credentialStore.setProviderApiKey(
                'openrouter',
                normalizedApiKey
              )
            : adapters.credentialStore.deleteProviderApiKey('openrouter'),
          // Update LM Studio API token
          normalizedLmstudioToken.length > 0
            ? adapters.credentialStore.setProviderApiKey(
                'lmstudio',
                normalizedLmstudioToken
              )
            : adapters.credentialStore.deleteProviderApiKey('lmstudio'),
        ]);

        // Update provider registry
        adapters.providerRegistry.setActiveProvider(draft.selectedProvider);

        const normalizedDraft = buildDraft({
          ...draft,
          apiKeyInput: normalizedApiKey,
          modelIdentifierInput: modelIdentifier,
          lmstudioApiTokenInput: normalizedLmstudioToken,
          systemPromptInput: normalizedSystemPrompt,
          fontSizeInput: String(parsedFontSize),
          nodeViewCornerRadiusInput: String(parsedNodeCornerRadius),
        });
        lastSavedDraftKeyRef.current = toDraftKey(normalizedDraft);
        setHasStoredApiKey(normalizedApiKey.length > 0);
        setHasStoredLmstudioToken(normalizedLmstudioToken.length > 0);
        setApiKeyInput(normalizedApiKey);
        setModelIdentifierInput(modelIdentifier);
        setLmstudioApiTokenInput(normalizedLmstudioToken);
        setSystemPromptInput(normalizedSystemPrompt);
        setFontSizeInput(String(parsedFontSize));
        setNodeViewCornerRadiusInput(String(parsedNodeCornerRadius));
        setNotice('All changes saved.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSaving(false);
      }
    },
    [
      adapters.credentialStore,
      adapters.providerRegistry,
      repositories.agentRepo,
      repositories.userPreferencesRepo,
    ]
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    const draft = buildDraft({
      selectedProvider,
      apiKeyInput,
      modelIdentifierInput,
      lmstudioEndpointInput,
      lmstudioApiTokenInput,
      lmstudioUseMcpTools,
      lmstudioAutoLoadModels,
      lmstudioSelectedModel,
      systemPromptInput,
      temperatureInput,
      maxTokensInput,
      verboseErrorAlerts,
      fontFace,
      fontSizeInput,
      nodeViewStyle,
      nodeViewCornerRadiusInput,
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
    selectedProvider,
    apiKeyInput,
    modelIdentifierInput,
    lmstudioEndpointInput,
    lmstudioApiTokenInput,
    lmstudioUseMcpTools,
    lmstudioAutoLoadModels,
    lmstudioSelectedModel,
    systemPromptInput,
    temperatureInput,
    maxTokensInput,
    verboseErrorAlerts,
    fontFace,
    fontSizeInput,
    nodeViewStyle,
    nodeViewCornerRadiusInput,
    loading,
    persistDraft,
  ]);

  // Validation
  const modelIdentifier = modelIdentifierInput.trim();
  const parsedTemperature = Number(temperatureInput.replace(',', '.').trim());
  const maxTokensRaw = maxTokensInput.trim();

  const hasValidOpenRouterModel =
    selectedProvider !== 'openrouter' || modelIdentifier.length > 0;
  const hasValidLmstudioModel =
    selectedProvider !== 'lmstudio' || lmstudioSelectedModel.length > 0;
  const hasValidTemperature =
    Number.isFinite(parsedTemperature) &&
    parsedTemperature >= 0 &&
    parsedTemperature <= 2;
  const hasValidMaxTokens =
    maxTokensRaw.length === 0 ||
    (Number.isInteger(Number(maxTokensRaw)) && Number(maxTokensRaw) > 0);
  const hasValidFontFace = SUPPORTED_CHAT_FONT_FACES.includes(fontFace);
  const parsedFontSize = Number(fontSizeInput.trim());
  const parsedNodeCornerRadius = Number(nodeViewCornerRadiusInput.trim());
  const hasValidFontSize =
    Number.isInteger(parsedFontSize) &&
    parsedFontSize >= MIN_CHAT_FONT_SIZE &&
    parsedFontSize <= MAX_CHAT_FONT_SIZE;
  const hasValidNodeCornerRadius =
    Number.isInteger(parsedNodeCornerRadius) &&
    parsedNodeCornerRadius >= MIN_NODE_CORNER_RADIUS &&
    parsedNodeCornerRadius <= MAX_NODE_CORNER_RADIUS;

  const hasValidationError =
    !hasValidOpenRouterModel ||
    !hasValidLmstudioModel ||
    !hasValidTemperature ||
    !hasValidMaxTokens ||
    !hasValidFontFace ||
    !hasValidFontSize ||
    !hasValidNodeCornerRadius;

  const apiKeyStatusText = hasStoredApiKey
    ? 'Stored securely. Clear this field to remove.'
    : 'No key currently stored.';

  return {
    loading,
    saving,
    error,
    notice,
    hasValidationError,

    // Provider selection
    selectedProvider,
    setSelectedProvider,

    // OpenRouter
    apiKeyStatusText,
    apiKeyInput,
    setApiKeyInput,
    hasStoredApiKey,
    showApiKey,
    setShowApiKey,
    modelIdentifierInput,
    setModelIdentifierInput,

    // LM Studio
    lmstudioEndpointInput,
    setLmstudioEndpointInput,
    lmstudioApiTokenInput,
    setLmstudioApiTokenInput,
    hasStoredLmstudioToken,
    showLmstudioToken,
    setShowLmstudioToken,
    lmstudioUseMcpTools,
    setLmstudioUseMcpTools,
    lmstudioAutoLoadModels,
    setLmstudioAutoLoadModels,
    lmstudioSelectedModel,
    setLmstudioSelectedModel,
    lmstudioModels,
    lmstudioModelsLoading,
    lmstudioModelsError,
    lmstudioConnectionStatus,
    fetchLmstudioModels,

    // Generation defaults
    systemPromptInput,
    setSystemPromptInput,
    temperatureInput,
    setTemperatureInput,
    maxTokensInput,
    setMaxTokensInput,

    // App behavior
    verboseErrorAlerts,
    setVerboseErrorAlerts,

    // Typography
    fontFace,
    setFontFace,
    fontSizeInput,
    setFontSizeInput,
    nodeViewStyle,
    setNodeViewStyle,
    nodeViewCornerRadiusInput,
    setNodeViewCornerRadiusInput,
  };
};
