import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import {
  describeProviderError,
  providerLabel,
} from '@application/services/llm';
import type { KeyedProvider } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { toErrorMessage } from '../../chat/error-message';
import { saveProviderKey, testProviderKey } from './provider-key-actions';
import { KEY_TEST_IDLE, type KeyTestState } from './provider-key-status';

/**
 * One hosted provider's API key on Settings → Connections (and onboarding):
 * the stored key, saving or removing it (an empty key removes), and the
 * "Test Key" call. A save writes to secure storage at once, so whatever
 * reads the key next sees it. Reads on every focus, so a key changed on
 * another screen shows here.
 */
export const useProviderKey = (provider: KeyedProvider) => {
  const { adapters } = useAppServices();
  const { credentialStore, providerRegistry } = adapters;
  const [loading, setLoading] = useState(true);
  const [storedKey, setStoredKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testState, setTestState] = useState<KeyTestState>(KEY_TEST_IDLE);
  // A key change ends any test still running for the old key.
  const latestTest = useRef(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const stored = await credentialStore.getProviderApiKey(provider);
      setStoredKey(stored?.trim() ?? '');
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [credentialStore, provider]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = useCallback(
    async (key: string): Promise<boolean> => {
      setError(null);
      latestTest.current += 1;
      setTestState(KEY_TEST_IDLE);
      try {
        const saved = await saveProviderKey(
          {
            credentialStore,
            adapters: {
              anthropic: providerRegistry.getAnthropicAdapter(),
              openai: providerRegistry.getOpenAIAdapter(),
            },
          },
          provider,
          key
        );
        setStoredKey(saved);
        return true;
      } catch (caught) {
        setError(toErrorMessage(caught));
        return false;
      }
    },
    [credentialStore, provider, providerRegistry]
  );

  const test = useCallback(async () => {
    const attempt = ++latestTest.current;
    setTestState({ status: 'checking' });
    const settle = (next: KeyTestState) => {
      if (attempt === latestTest.current) {
        setTestState(next);
      }
    };
    try {
      const modelCount = await testProviderKey(
        {
          anthropic: providerRegistry.getAnthropicAdapter(),
          openai: providerRegistry.getOpenAIAdapter(),
        },
        provider,
        storedKey
      );
      settle({ status: 'ok', modelCount });
    } catch (caught) {
      const failure = describeProviderError(caught, { provider });
      settle({
        status: 'failed',
        // The sheet is where the key gets fixed, so no "check Connections".
        message:
          failure.kind === 'key-rejected'
            ? `${providerLabel(provider)} didn't accept this key.`
            : failure.message,
        detail: failure.detail,
      });
    }
  }, [provider, providerRegistry, storedKey]);

  return {
    provider,
    loading,
    storedKey,
    hasStoredKey: storedKey.length > 0,
    error,
    testState,
    save,
    /** Removes the stored key. */
    remove: useCallback(() => save(''), [save]),
    test,
  };
};

export type ProviderKeyController = ReturnType<typeof useProviderKey>;
