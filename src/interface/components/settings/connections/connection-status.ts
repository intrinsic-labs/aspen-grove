import type { KeyedProvider, SelectableProvider } from '@domain/entities';

/** What the Connections list reads to say where each provider stands. */
export type ConnectionSnapshot = {
  readonly hasKey: Readonly<Record<KeyedProvider, boolean>>;
  /** LM Studio's saved server address. */
  readonly lmstudioEndpoint: string;
};

/** `http://localhost:1235/v1/` as `localhost:1235`. */
const serverAddress = (endpoint: string): string =>
  endpoint
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\/.*$/, '');

/**
 * The one-line status beside a provider's row. A key provider has a key or
 * not. LM Studio has no key: it reads as its saved server address, or
 * "Not set up" once the address is cleared. (It doesn't call the server:
 * the list shouldn't wait on the network, and Test Connection is one tap
 * away on its screen.)
 */
export const connectionStatus = (
  provider: SelectableProvider,
  snapshot: ConnectionSnapshot
): string => {
  if (provider === 'lmstudio') {
    return serverAddress(snapshot.lmstudioEndpoint) || 'Not set up';
  }
  return snapshot.hasKey[provider] ? 'Key stored' : 'No key';
};
