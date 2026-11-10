import { MissingProviderKeyError } from '@application/services/llm';
import type { ICredentialStore } from '@application/services/security';
import type { SelectableProvider } from '@domain/entities';

const ENV_KEY_MAP: Record<SelectableProvider, string> = {
  openrouter: 'EXPO_PUBLIC_OPENROUTER_API_KEY',
  lmstudio: 'EXPO_PUBLIC_LMSTUDIO_API_TOKEN',
};

/**
 * The stored key for a provider (secure storage first, then the build's env
 * fallback), or `null` when there is none.
 */
export const findProviderApiKey = async (
  credentialStore: Pick<ICredentialStore, 'getProviderApiKey'>,
  provider: SelectableProvider
): Promise<string | null> => {
  const fromSecureStore = await credentialStore.getProviderApiKey(provider);
  if (fromSecureStore && fromSecureStore.trim().length > 0) {
    return fromSecureStore.trim();
  }

  const fromEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.[ENV_KEY_MAP[provider]]?.trim();
  return fromEnv ? fromEnv : null;
};

/**
 * Reads the API key for a provider. LM Studio's token is optional, so it
 * resolves to an empty string; a missing OpenRouter key throws
 * `MissingProviderKeyError`, which the UI turns into "add your key".
 */
export const getProviderApiKey = async (
  credentialStore: Pick<ICredentialStore, 'getProviderApiKey'>,
  provider: SelectableProvider
): Promise<string> => {
  const key = await findProviderApiKey(credentialStore, provider);
  if (key) {
    return key;
  }
  if (provider === 'lmstudio') {
    return '';
  }
  throw new MissingProviderKeyError(provider);
};
