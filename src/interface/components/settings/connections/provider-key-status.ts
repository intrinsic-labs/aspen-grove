import type { ProviderKeyConfig } from './provider-key-config';

/** The state of a key's "Test Key" call. */
export type KeyTestState =
  | { readonly status: 'idle' }
  | { readonly status: 'checking' }
  | { readonly status: 'ok'; readonly modelCount: number }
  | {
      readonly status: 'failed';
      readonly message: string;
      readonly detail?: string;
    };

export const KEY_TEST_IDLE: KeyTestState = { status: 'idle' };

const plural = (count: number): string =>
  `${count} ${count === 1 ? 'model' : 'models'}`;

/** The key section's footer: whether a key is stored, and how its test went. */
export const keyStatusText = (
  config: ProviderKeyConfig,
  hasStoredKey: boolean,
  test: KeyTestState
): string => {
  if (!hasStoredKey) {
    return config.needsKeyCopy;
  }
  switch (test.status) {
    case 'checking':
      return 'Checking the key…';
    case 'ok':
      return `${config.name} accepted the key. ${plural(test.modelCount)} available.`;
    case 'failed':
      return test.message;
    case 'idle':
      return 'A key is stored on this device.';
  }
};
