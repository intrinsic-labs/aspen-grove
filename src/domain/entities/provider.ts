/**
 * Provider identifiers stored in modelRefs, raw responses and secure-store keys.
 * Keep unsupported identifiers readable for existing installations and imported
 * placeholder agents (`custom:imported`). Only RoutableProvider has an adapter.
 */
export type Provider =
  | 'openrouter'
  | 'lmstudio'
  | 'hyperbolic'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'local'
  | 'custom';

/** Providers exposed by the current UI; direct-provider screens are separate work. */
export type SelectableProvider = 'openrouter' | 'lmstudio';

export const SELECTABLE_PROVIDERS: readonly SelectableProvider[] = [
  'openrouter',
  'lmstudio',
] as const;

export const isSelectableProvider = (
  value: string
): value is SelectableProvider =>
  SELECTABLE_PROVIDERS.includes(value as SelectableProvider);

/** Backend routing can be enabled before a provider's picker/connection UI. */
export type RoutableProvider = SelectableProvider | 'anthropic' | 'openai';
export const ROUTABLE_PROVIDERS: readonly RoutableProvider[] = [
  ...SELECTABLE_PROVIDERS,
  'anthropic',
  'openai',
];
export const isRoutableProvider = (value: string): value is RoutableProvider =>
  ROUTABLE_PROVIDERS.includes(value as RoutableProvider);
