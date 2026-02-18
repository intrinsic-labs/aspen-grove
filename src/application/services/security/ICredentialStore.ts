import type { Provider } from '@domain/entities';

/**
 * Stores and retrieves provider credentials from secure storage.
 */
export interface ICredentialStore {
  getProviderApiKey(provider: Provider): Promise<string | null>;
  setProviderApiKey(provider: Provider, apiKey: string): Promise<void>;
  deleteProviderApiKey(provider: Provider): Promise<void>;
}
