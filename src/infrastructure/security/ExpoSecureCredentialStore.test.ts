import * as SecureStore from 'expo-secure-store';
import { ExpoSecureCredentialStore } from './ExpoSecureCredentialStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
it.each([
  ['anthropic', 'anthropic_api_key'],
  ['openai', 'openai_api_key'],
] as const)(
  'stores %s keys using the existing secure-store entry',
  async (provider, key) => {
    const store = new ExpoSecureCredentialStore();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('test-key');
    await store.setProviderApiKey(provider, 'test-key');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, 'test-key');
    expect(await store.getProviderApiKey(provider)).toBe('test-key');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
    await store.deleteProviderApiKey(provider);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
  }
);
