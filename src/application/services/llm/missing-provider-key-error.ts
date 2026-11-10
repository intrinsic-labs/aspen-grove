import type { Provider } from '@domain/entities';

/**
 * Thrown before a request when the provider needs a key and none is stored.
 * Kept apart from `LlmProviderError` so the UI can tell "no key yet" from
 * "the provider refused the key".
 */
export class MissingProviderKeyError extends Error {
  readonly provider: Provider;

  constructor(provider: Provider, message?: string) {
    super(message ?? `No API key stored for ${provider}.`);
    this.name = 'MissingProviderKeyError';
    this.provider = provider;
  }
}
