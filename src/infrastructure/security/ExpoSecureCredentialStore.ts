import * as SecureStore from 'expo-secure-store';
import type { ICredentialStore } from '@application/services/security';
import type { Provider } from '@domain/entities';

const PROVIDER_API_KEY_MAP: Record<Provider, string> = {
  openrouter: 'openrouter_api_key',
  hyperbolic: 'hyperbolic_api_key',
  anthropic: 'anthropic_api_key',
  openai: 'openai_api_key',
  google: 'google_api_key',
  local: 'local_api_key',
  custom: 'custom_api_key',
};

/** SecureStore implementation of `ICredentialStore` for mobile. */
export class ExpoSecureCredentialStore implements ICredentialStore {
  async getProviderApiKey(provider: Provider): Promise<string | null> {
    const key = PROVIDER_API_KEY_MAP[provider];
    const value = await SecureStore.getItemAsync(key);
    return value ? value : null;
  }

  async setProviderApiKey(provider: Provider, apiKey: string): Promise<void> {
    const key = PROVIDER_API_KEY_MAP[provider];
    await SecureStore.setItemAsync(key, apiKey);
  }

  async deleteProviderApiKey(provider: Provider): Promise<void> {
    const key = PROVIDER_API_KEY_MAP[provider];
    await SecureStore.deleteItemAsync(key);
  }
}
