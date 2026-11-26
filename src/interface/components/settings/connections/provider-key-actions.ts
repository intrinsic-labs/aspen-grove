import type { ICredentialStore } from '@application/services/security';
import type {
  LlmProviderCredentials,
  LlmProviderInitializeOptions,
  OpenRouterCatalogModel,
} from '@application/services/llm';
import type { KeyedProvider } from '@domain/entities';

/** The slice of a direct adapter a key needs: connect with it, list models. */
export type KeyedAdapter = {
  initialize(
    credentials: LlmProviderCredentials,
    options?: LlmProviderInitializeOptions
  ): Promise<boolean>;
  fetchModels(): Promise<readonly OpenRouterCatalogModel[]>;
};

/** The adapters that hold a connection of their own (OpenRouter's does not). */
export type KeyedAdapters = {
  readonly anthropic: KeyedAdapter;
  readonly openai: KeyedAdapter;
};

const adapterFor = (
  adapters: KeyedAdapters,
  provider: KeyedProvider
): KeyedAdapter | null =>
  provider === 'openrouter' ? null : adapters[provider];

/**
 * Saves a provider's key to secure storage; an empty key removes it. The
 * provider's adapter is re-initialized at once so the change (and its model
 * list) takes effect without a restart. Returns the key as stored ('' when
 * removed).
 */
export const saveProviderKey = async (
  deps: {
    readonly credentialStore: Pick<
      ICredentialStore,
      'setProviderApiKey' | 'deleteProviderApiKey'
    >;
    readonly adapters: KeyedAdapters;
  },
  provider: KeyedProvider,
  key: string
): Promise<string> => {
  const trimmed = key.trim();
  if (trimmed.length > 0) {
    await deps.credentialStore.setProviderApiKey(provider, trimmed);
  } else {
    await deps.credentialStore.deleteProviderApiKey(provider);
  }
  await adapterFor(deps.adapters, provider)?.initialize({ apiKey: trimmed });
  return trimmed;
};

/**
 * Checks a key with the provider's own authenticated model list. Resolves to
 * how many models it lists; rejects with the adapter's error when the key is
 * refused or the provider can't be reached.
 */
export const testProviderKey = async (
  adapters: KeyedAdapters,
  provider: KeyedProvider,
  key: string
): Promise<number> => {
  const adapter = adapterFor(adapters, provider);
  if (!adapter) {
    throw new Error(`${provider} keys have no test call.`);
  }
  await adapter.initialize({ apiKey: key.trim() });
  return (await adapter.fetchModels()).length;
};
