import {
  SELECTABLE_PROVIDERS,
  type SelectableProvider,
} from '@domain/entities';

export const PROVIDER_LABELS: Record<SelectableProvider, string> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  lmstudio: 'LM Studio',
};

/** Which direct providers have a key stored. */
export type DirectKeyPresence = {
  readonly anthropic: boolean;
  readonly openai: boolean;
};

/**
 * The providers a picker offers: OpenRouter and LM Studio always (as before),
 * Anthropic and OpenAI once a key is stored for them, and `current` even when
 * it isn't connected, so a tree or agent already on a provider whose key was
 * removed still reads true. Listed in Settings' order.
 */
export const pickerProviders = (
  keys: DirectKeyPresence,
  current?: SelectableProvider | null
): readonly SelectableProvider[] =>
  SELECTABLE_PROVIDERS.filter(
    (provider) =>
      provider === current ||
      provider === 'openrouter' ||
      provider === 'lmstudio' ||
      keys[provider]
  );

/** The Provider picker's items. */
export const providerOptions = (
  providers: readonly SelectableProvider[]
): readonly { readonly value: SelectableProvider; readonly label: string }[] =>
  providers.map((value) => ({ value, label: PROVIDER_LABELS[value] }));
