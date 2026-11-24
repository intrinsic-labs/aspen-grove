import {
  getProviderApiKey,
  findProviderApiKey,
  buildProviderApiKey,
} from './provider-key';

it.each(['anthropic', 'openai'] as const)(
  'reads %s from secure storage and requires a stored key',
  async (provider) => {
    const credentialStore = {
      getProviderApiKey: jest.fn().mockResolvedValue(' key '),
    };
    expect(await getProviderApiKey(credentialStore, provider)).toBe('key');
    expect(credentialStore.getProviderApiKey).toHaveBeenCalledWith(provider);
    expect(buildProviderApiKey(provider)).toBeNull();
    credentialStore.getProviderApiKey.mockResolvedValue(null);
    expect(await findProviderApiKey(credentialStore, provider)).toBeNull();
    await expect(
      getProviderApiKey(credentialStore, provider)
    ).rejects.toMatchObject({ name: 'MissingProviderKeyError', provider });
  }
);
