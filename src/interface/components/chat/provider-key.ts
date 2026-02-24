import type { ICredentialStore } from '@application/services/security';

/**
 * Reads OpenRouter API key from secure storage first, then env fallback.
 */
export const getOpenRouterApiKey = async (
  credentialStore: ICredentialStore
): Promise<string> => {
  const fromSecureStore = await credentialStore.getProviderApiKey('openrouter');
  if (fromSecureStore && fromSecureStore.trim().length > 0) {
    return fromSecureStore.trim();
  }

  const fromEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.EXPO_PUBLIC_OPENROUTER_API_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  throw new Error(
    'OpenRouter API key not found. Set EXPO_PUBLIC_OPENROUTER_API_KEY or store openrouter_api_key in secure storage.'
  );
};

