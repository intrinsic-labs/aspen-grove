/**
 * Every provider a stored value may name. Only `SelectableProvider`s
 * (OpenRouter, LM Studio) have adapters; don't build on the others.
 *
 * Why the union isn't narrowed to the selectable two (checked 2026-11-21,
 * main 1f4bea4):
 * - `custom` is written today: Open Loom import gives each imported tree's
 *   model nodes a placeholder agent with modelRef `custom:imported`
 *   (ImportLoomTreeUseCase), stored in `agents.model_ref`.
 * - Every agent read parses `agents.model_ref` with `parseModelRef`
 *   (WatermelonAgentRepository#toDomain), which throws on a prefix missing
 *   from this list, so one unrecognised row would fail `findAll` and with it
 *   the agent list, tree loading and settings.
 * - `hyperbolic`, `anthropic`, `openai`, `google` and `local`: no app code,
 *   in any commit, writes them (only tests and this list do), and import
 *   doesn't copy a file's provider into `raw_api_responses` or an agent. But
 *   installs' databases can't be inspected, the app deliberately keeps legacy
 *   agents such as `anthropic:…` loadable (`isRoutableModelRef`), and
 *   `raw_api_responses.provider` and the secure-store key names
 *   (ExpoSecureCredentialStore) are keyed by this type. Narrowing can't be
 *   shown safe for stored data, so it stays (see AGENTS.md).
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
