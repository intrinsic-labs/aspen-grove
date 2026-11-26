import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { SelectableProvider } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { pickerProviders, type DirectKeyPresence } from './provider-options';

const NO_KEYS: DirectKeyPresence = { anthropic: false, openai: false };

/**
 * The providers a picker offers: those that need no key, and Anthropic and
 * OpenAI when their key is stored. Read on every focus, so a key added in
 * Connections shows up when the picker is shown again. `current` stays
 * listed even when it has no key.
 */
export const useConnectedProviders = (
  current?: SelectableProvider | null
): readonly SelectableProvider[] => {
  const { adapters } = useAppServices();
  const [keys, setKeys] = useState<DirectKeyPresence>(NO_KEYS);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const [anthropic, openai] = await Promise.all([
            adapters.credentialStore.getProviderApiKey('anthropic'),
            adapters.credentialStore.getProviderApiKey('openai'),
          ]);
          if (!cancelled) {
            setKeys({
              anthropic: Boolean(anthropic?.trim()),
              openai: Boolean(openai?.trim()),
            });
          }
        } catch {
          // Unreadable storage: offer only the providers that need no key.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [adapters.credentialStore])
  );

  return pickerProviders(keys, current);
};
