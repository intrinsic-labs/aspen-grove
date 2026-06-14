/** LLM Providers supported by Aspen Grove */
export type Provider =
  | 'openrouter'
  | 'lmstudio'
  | 'hyperbolic'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'local'
  | 'custom';

/** Providers that can be selected as the active provider */
export type SelectableProvider = 'openrouter' | 'lmstudio';

export const SELECTABLE_PROVIDERS: readonly SelectableProvider[] = [
  'openrouter',
  'lmstudio',
] as const;

export const isSelectableProvider = (
  value: string
): value is SelectableProvider =>
  SELECTABLE_PROVIDERS.includes(value as SelectableProvider);
