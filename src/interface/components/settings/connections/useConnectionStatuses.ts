import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import {
  DEFAULT_LMSTUDIO_SETTINGS,
  KEYED_PROVIDERS,
  type SelectableProvider,
} from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { connectionStatus, type ConnectionSnapshot } from './connection-status';

type ConnectionStatuses = Partial<Record<SelectableProvider, string>>;

/**
 * The status line beside each provider on the Connections list, read again
 * on every focus so a key added or removed on a provider's screen shows when
 * the list comes back. Reads the stored key, as each provider's key section
 * does. Empty until the first read.
 */
export const useConnectionStatuses = (): ConnectionStatuses => {
  const { adapters, repositories } = useAppServices();
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const [keys, preferences] = await Promise.all([
            Promise.all(
              KEYED_PROVIDERS.map(
                async (provider) =>
                  [
                    provider,
                    Boolean(
                      (
                        await adapters.credentialStore.getProviderApiKey(
                          provider
                        )
                      )?.trim()
                    ),
                  ] as const
              )
            ),
            repositories.userPreferencesRepo.get(),
          ]);
          if (!cancelled) {
            setSnapshot({
              hasKey: Object.fromEntries(keys) as ConnectionSnapshot['hasKey'],
              lmstudioEndpoint:
                preferences.lmstudioSettings?.endpoint ??
                DEFAULT_LMSTUDIO_SETTINGS.endpoint,
            });
          }
        } catch {
          // Unreadable: the rows show no status; each screen says why.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [adapters.credentialStore, repositories.userPreferencesRepo])
  );

  if (!snapshot) {
    return {};
  }
  return {
    openrouter: connectionStatus('openrouter', snapshot),
    anthropic: connectionStatus('anthropic', snapshot),
    openai: connectionStatus('openai', snapshot),
    lmstudio: connectionStatus('lmstudio', snapshot),
  };
};
