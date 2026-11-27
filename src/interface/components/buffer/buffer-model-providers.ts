import {
  isSelectableProvider,
  type SelectableProvider,
} from '@domain/entities';

export type BufferModelProvider = Extract<
  SelectableProvider,
  'openrouter' | 'lmstudio'
>;

export type BufferConnectionSnapshot = {
  readonly hasOpenRouterKey: boolean;
  readonly lmStudioEndpoint: string;
};

/** Base completions exist only on these two adapters. */
export const connectedBufferModelProviders = (
  connections: BufferConnectionSnapshot
): readonly BufferModelProvider[] => [
  ...(connections.hasOpenRouterKey ? (['openrouter'] as const) : []),
  ...(connections.lmStudioEndpoint.trim() ? (['lmstudio'] as const) : []),
];

export const bufferProviderFromModelRef = (
  modelRef: string | undefined
): BufferModelProvider | null => {
  const colon = modelRef?.indexOf(':') ?? -1;
  const provider = colon > 0 ? modelRef?.slice(0, colon) : undefined;
  return provider &&
    isSelectableProvider(provider) &&
    (provider === 'openrouter' || provider === 'lmstudio')
    ? provider
    : null;
};

export const bufferModelIdFromRef = (
  modelRef: string | undefined
): string | null => {
  const colon = modelRef?.indexOf(':') ?? -1;
  return colon > 0 ? (modelRef?.slice(colon + 1) ?? null) : null;
};

/** Prefer the tree's current base-capable provider, then the first connected one. */
export const initialBufferModelProvider = (
  current: BufferModelProvider | null,
  connected: readonly BufferModelProvider[]
): BufferModelProvider | null =>
  current && connected.includes(current) ? current : (connected[0] ?? null);
