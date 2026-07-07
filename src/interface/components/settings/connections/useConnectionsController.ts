import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { DEFAULT_LMSTUDIO_SETTINGS } from '@domain/entities';
import { useAppServices } from '@interface/composition';

export type LmStudioConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'checking'
  | 'idle';

type ConnectionsDraft = {
  readonly apiKeyInput: string;
  readonly lmstudioEndpointInput: string;
  readonly lmstudioApiTokenInput: string;
  readonly lmstudioUseMcpTools: boolean;
  readonly lmstudioAutoLoadModels: boolean;
};

const toDraftKey = (draft: ConnectionsDraft): string => JSON.stringify(draft);

/**
 * Provider connection settings: OpenRouter API key and the LM Studio server
 * connection (endpoint, optional token, MCP + auto-load switches).
 *
 * This is deliberately the only credential-bearing settings surface. Model
 * and generation configuration live on Agents (Settings → Agents and the
 * chat ⚙️ sheet), not here.
 */
export const useConnectionsController = () => {
  const { repositories, adapters } = useAppServices();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedDraftKeyRef = useRef<string | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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
  const [lmstudioConnectionStatus, setLmstudioConnectionStatus] =
    useState<LmStudioConnectionStatus>('idle');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userPreferences, storedOpenRouterKey, storedLmstudioToken] =
        await Promise.all([
          repositories.userPreferencesRepo.get(),
          adapters.credentialStore.getProviderApiKey('openrouter'),
          adapters.credentialStore.getProviderApiKey('lmstudio'),
        ]);

      const lmSettings = userPreferences.lmstudioSettings;
      const draft: ConnectionsDraft = {
        apiKeyInput: storedOpenRouterKey?.trim() ?? '',
        lmstudioEndpointInput: lmSettings.endpoint,
        lmstudioApiTokenInput: storedLmstudioToken?.trim() ?? '',
        lmstudioUseMcpTools: lmSettings.useMcpTools,
        lmstudioAutoLoadModels: lmSettings.autoLoadModels,
      };

      setApiKeyInput(draft.apiKeyInput);
      setHasStoredApiKey(draft.apiKeyInput.length > 0);
      setLmstudioEndpointInput(draft.lmstudioEndpointInput);
      setLmstudioApiTokenInput(draft.lmstudioApiTokenInput);
      setHasStoredLmstudioToken(draft.lmstudioApiTokenInput.length > 0);
      setLmstudioUseMcpTools(draft.lmstudioUseMcpTools);
      setLmstudioAutoLoadModels(draft.lmstudioAutoLoadModels);

      lastSavedDraftKeyRef.current = toDraftKey(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [adapters.credentialStore, repositories.userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return undefined;
    }, [loadSettings])
  );

  const testLmstudioConnection = useCallback(async () => {
    setLmstudioConnectionStatus('checking');
    try {
      const lmstudioAdapter = adapters.providerRegistry.getLMStudioAdapter();
      await lmstudioAdapter.initialize(
        { apiKey: lmstudioApiTokenInput.trim() },
        { endpoint: lmstudioEndpointInput.trim() }
      );
      lmstudioAdapter.configure({
        useMcpTools: lmstudioUseMcpTools,
        autoLoadModels: lmstudioAutoLoadModels,
      });
      await lmstudioAdapter.fetchModels();
      setLmstudioConnectionStatus('connected');
    } catch {
      setLmstudioConnectionStatus('disconnected');
    }
  }, [
    adapters.providerRegistry,
    lmstudioApiTokenInput,
    lmstudioAutoLoadModels,
    lmstudioEndpointInput,
    lmstudioUseMcpTools,
  ]);

  const persistDraft = useCallback(
    async (draft: ConnectionsDraft): Promise<void> => {
      const normalizedApiKey = draft.apiKeyInput.trim();
      const normalizedLmstudioToken = draft.lmstudioApiTokenInput.trim();
      const normalizedEndpoint = draft.lmstudioEndpointInput.trim();

      setSaving(true);
      setError(null);

      try {
        await Promise.all([
          repositories.userPreferencesRepo.update({
            lmstudioSettings: {
              endpoint: normalizedEndpoint,
              useMcpTools: draft.lmstudioUseMcpTools,
              autoLoadModels: draft.lmstudioAutoLoadModels,
            },
          }),
          normalizedApiKey.length > 0
            ? adapters.credentialStore.setProviderApiKey(
                'openrouter',
                normalizedApiKey
              )
            : adapters.credentialStore.deleteProviderApiKey('openrouter'),
          normalizedLmstudioToken.length > 0
            ? adapters.credentialStore.setProviderApiKey(
                'lmstudio',
                normalizedLmstudioToken
              )
            : adapters.credentialStore.deleteProviderApiKey('lmstudio'),
        ]);

        // Re-initialize the LM Studio adapter so the new connection settings
        // take effect immediately (the token itself is re-read from secure
        // storage at request time).
        const lmstudioAdapter = adapters.providerRegistry.getLMStudioAdapter();
        await lmstudioAdapter.initialize(
          { apiKey: normalizedLmstudioToken },
          { endpoint: normalizedEndpoint }
        );
        lmstudioAdapter.configure({
          useMcpTools: draft.lmstudioUseMcpTools,
          autoLoadModels: draft.lmstudioAutoLoadModels,
        });

        lastSavedDraftKeyRef.current = toDraftKey({
          ...draft,
          apiKeyInput: normalizedApiKey,
          lmstudioApiTokenInput: normalizedLmstudioToken,
          lmstudioEndpointInput: normalizedEndpoint,
        });
        setHasStoredApiKey(normalizedApiKey.length > 0);
        setHasStoredLmstudioToken(normalizedLmstudioToken.length > 0);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSaving(false);
      }
    },
    [
      adapters.credentialStore,
      adapters.providerRegistry,
      repositories.userPreferencesRepo,
    ]
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    const draft: ConnectionsDraft = {
      apiKeyInput,
      lmstudioEndpointInput,
      lmstudioApiTokenInput,
      lmstudioUseMcpTools,
      lmstudioAutoLoadModels,
    };
    if (toDraftKey(draft) === lastSavedDraftKeyRef.current) {
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
    lmstudioEndpointInput,
    lmstudioApiTokenInput,
    lmstudioUseMcpTools,
    lmstudioAutoLoadModels,
    loading,
    persistDraft,
  ]);

  const apiKeyStatusText = hasStoredApiKey
    ? 'Stored securely. Clear this field to remove.'
    : 'No key currently stored.';

  return {
    loading,
    saving,
    error,

    // OpenRouter
    apiKeyStatusText,
    apiKeyInput,
    setApiKeyInput,
    hasStoredApiKey,
    showApiKey,
    setShowApiKey,

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
    lmstudioConnectionStatus,
    testLmstudioConnection,
  };
};
