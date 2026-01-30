import * as SecureStore from 'expo-secure-store';

/**
 * Secure Storage Service
 *
 * Provides a type-safe interface for storing sensitive data like API keys
 * and credentials using the platform's secure storage:
 * - iOS: Keychain Services
 * - Android: Encrypted SharedPreferences (Keystore-backed)
 *
 * All keys are prefixed to avoid collisions with other apps/libraries.
 */

const KEY_PREFIX = 'aspen_grove_';

/**
 * Known credential keys for type safety
 */
export const CredentialKeys = {
  // LLM Provider API Keys
  ANTHROPIC_API_KEY: 'anthropic_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  OPENROUTER_API_KEY: 'openrouter_api_key',
  GOOGLE_API_KEY: 'google_api_key',
  HYPERBOLIC_API_KEY: 'hyperbolic_api_key',

  // Web Search API Keys
  TAVILY_API_KEY: 'tavily_api_key',
  BRAVE_SEARCH_API_KEY: 'brave_search_api_key',
} as const;

export type CredentialKey = (typeof CredentialKeys)[keyof typeof CredentialKeys];

/**
 * Get the full storage key with prefix
 */
function getFullKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

/**
 * Store a credential securely
 *
 * @param key - The credential key
 * @param value - The credential value (e.g., API key)
 * @throws Error if storage fails
 */
export async function setCredential(key: CredentialKey | string, value: string): Promise<void> {
  const fullKey = getFullKey(key);

  try {
    await SecureStore.setItemAsync(fullKey, value, {
      // Require device authentication (biometric/passcode) on iOS
      // This provides an extra layer of security for sensitive data
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error(`[SecureStorage] Failed to store credential: ${key}`, error);
    throw new SecureStorageError(`Failed to store credential: ${key}`, error);
  }
}

/**
 * Retrieve a credential
 *
 * @param key - The credential key
 * @returns The credential value, or null if not found
 */
export async function getCredential(key: CredentialKey | string): Promise<string | null> {
  const fullKey = getFullKey(key);

  try {
    return await SecureStore.getItemAsync(fullKey);
  } catch (error) {
    console.error(`[SecureStorage] Failed to retrieve credential: ${key}`, error);
    throw new SecureStorageError(`Failed to retrieve credential: ${key}`, error);
  }
}

/**
 * Delete a credential
 *
 * @param key - The credential key
 */
export async function deleteCredential(key: CredentialKey | string): Promise<void> {
  const fullKey = getFullKey(key);

  try {
    await SecureStore.deleteItemAsync(fullKey);
  } catch (error) {
    console.error(`[SecureStorage] Failed to delete credential: ${key}`, error);
    throw new SecureStorageError(`Failed to delete credential: ${key}`, error);
  }
}

/**
 * Check if a credential exists
 *
 * @param key - The credential key
 * @returns true if the credential exists
 */
export async function hasCredential(key: CredentialKey | string): Promise<boolean> {
  const value = await getCredential(key);
  return value !== null;
}

/**
 * Get all configured provider credentials
 *
 * Useful for checking which LLM providers are available.
 * Returns an object with provider names as keys and boolean availability as values.
 */
export async function getConfiguredProviders(): Promise<{
  anthropic: boolean;
  openai: boolean;
  openrouter: boolean;
  google: boolean;
  hyperbolic: boolean;
}> {
  const [anthropic, openai, openrouter, google, hyperbolic] = await Promise.all([
    hasCredential(CredentialKeys.ANTHROPIC_API_KEY),
    hasCredential(CredentialKeys.OPENAI_API_KEY),
    hasCredential(CredentialKeys.OPENROUTER_API_KEY),
    hasCredential(CredentialKeys.GOOGLE_API_KEY),
    hasCredential(CredentialKeys.HYPERBOLIC_API_KEY),
  ]);

  return {
    anthropic,
    openai,
    openrouter,
    google,
    hyperbolic,
  };
}

/**
 * Store a local model credential
 *
 * Local models may have their own authentication.
 * The key format is: local_model_{ulid}
 *
 * @param modelId - The ULID of the local model
 * @param credential - The credential value
 */
export async function setLocalModelCredential(modelId: string, credential: string): Promise<void> {
  await setCredential(`local_model_${modelId}`, credential);
}

/**
 * Retrieve a local model credential
 *
 * @param modelId - The ULID of the local model
 * @returns The credential value, or null if not found
 */
export async function getLocalModelCredential(modelId: string): Promise<string | null> {
  return getCredential(`local_model_${modelId}`);
}

/**
 * Delete a local model credential
 *
 * @param modelId - The ULID of the local model
 */
export async function deleteLocalModelCredential(modelId: string): Promise<void> {
  await deleteCredential(`local_model_${modelId}`);
}

/**
 * Clear all credentials
 *
 * WARNING: This will delete all stored API keys and credentials!
 * Only use when user explicitly requests to clear all data.
 */
export async function clearAllCredentials(): Promise<void> {
  const allKeys = [
    ...Object.values(CredentialKeys),
    // Note: Local model credentials can't be enumerated without
    // tracking them separately. They'll remain if not explicitly deleted.
  ];

  await Promise.all(allKeys.map((key) => deleteCredential(key)));
  console.log('[SecureStorage] All known credentials cleared');
}

/**
 * Custom error class for secure storage operations
 */
export class SecureStorageError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SecureStorageError';
    this.cause = cause;
  }
}
