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

/** Providers a user can pick for a tree or an agent. */
export type SelectableProvider =
  'openrouter' | 'anthropic' | 'openai' | 'lmstudio';

/** In the order Settings and the pickers list them. */
export const SELECTABLE_PROVIDERS: readonly SelectableProvider[] = [
  'openrouter',
  'anthropic',
  'openai',
  'lmstudio',
] as const;

export const isSelectableProvider = (
  value: string
): value is SelectableProvider =>
  SELECTABLE_PROVIDERS.includes(value as SelectableProvider);

/** Providers that have an adapter. Today these are the selectable ones. */
export type RoutableProvider = SelectableProvider;
export const ROUTABLE_PROVIDERS: readonly RoutableProvider[] =
  SELECTABLE_PROVIDERS;
export const isRoutableProvider = (value: string): value is RoutableProvider =>
  ROUTABLE_PROVIDERS.includes(value as RoutableProvider);

/** Hosted providers, each reached with an API key the user stores. */
export type KeyedProvider = 'openrouter' | 'anthropic' | 'openai';
export const KEYED_PROVIDERS: readonly KeyedProvider[] = [
  'openrouter',
  'anthropic',
  'openai',
] as const;
export const isKeyedProvider = (value: string): value is KeyedProvider =>
  KEYED_PROVIDERS.includes(value as KeyedProvider);
