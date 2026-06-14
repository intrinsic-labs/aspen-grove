import type { ICredentialStore } from '@application/services/security';
import type { SelectableProvider } from '@domain/entities';

const ENV_KEY_MAP: Record<SelectableProvider, string> = {
  openrouter: 'EXPO_PUBLIC_OPENROUTER_API_KEY',
  lmstudio: 'EXPO_PUBLIC_LMSTUDIO_API_TOKEN',
};

/**
 * Reads API key for a provider from secure storage first, then env fallback.
 * For LM Studio, returns empty string if no key is found (it's optional).
 */
export const getProviderApiKey = async (
  credentialStore: ICredentialStore,
  provider: SelectableProvider
): Promise<string> => {
  const fromSecureStore = await credentialStore.getProviderApiKey(provider);
  if (fromSecureStore && fromSecureStore.trim().length > 0) {
    return fromSecureStore.trim();
  }

  const envKey = ENV_KEY_MAP[provider];
  const fromEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.[envKey]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  // LM Studio doesn't require an API key
  if (provider === 'lmstudio') {
    return '';
  }

  throw new Error(
    `${provider} API key not found. Set ${envKey} or store in secure storage.`
  );
};

/**
 * Reads OpenRouter API key from secure storage first, then env fallback.
 * @deprecated Use getProviderApiKey instead
 */
export const getOpenRouterApiKey = async (
  credentialStore: ICredentialStore
): Promise<string> => {
  return getProviderApiKey(credentialStore, 'openrouter');
};
