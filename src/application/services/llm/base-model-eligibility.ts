import type { Provider } from '@domain/entities';

export type VerifiedBaseModelCheckpoint = {
  readonly provider: 'openrouter' | 'lmstudio';
  /** Exact provider catalog id, when the hosted provider supplies one. */
  readonly catalogId?: string;
  /** Exact publisher from a local provider's native model list. */
  readonly publisher?: string;
  /** Exact local keys known to identify this checkpoint. */
  readonly localKeys?: readonly string[];
  /** Canonical checkpoint or artifact identity. */
  readonly weightIdentity: string;
  /** Primary evidence that the checkpoint is pretrained, not instruction tuned. */
  readonly sourceUrl: string;
};

export type BaseModelCatalogEntry = {
  readonly id: string;
  readonly publisher?: string;
  readonly artifactIdentifier?: string;
  readonly connectionEndpoint?: string;
  readonly weightIdentity?: string;
  readonly outputModalities?: readonly string[];
  readonly endpoints?: readonly string[];
};

export const OPENROUTER_VERIFIED_BASE_CHECKPOINTS =
  [] as const satisfies readonly VerifiedBaseModelCheckpoint[];

export const LMSTUDIO_VERIFIED_BASE_CHECKPOINTS = [
  {
    provider: 'lmstudio',
    publisher: 'Qwen',
    // Confirm this exact served key against LM Studio when the screen is integrated.
    localKeys: ['qwen2.5-7b'],
    weightIdentity: 'Qwen/Qwen2.5-7B',
    sourceUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B',
  },
] as const satisfies readonly VerifiedBaseModelCheckpoint[];

/** Exact source-linked checkpoints accepted by the product. */
export const VERIFIED_BASE_MODEL_CHECKPOINTS = [
  ...OPENROUTER_VERIFIED_BASE_CHECKPOINTS,
  ...LMSTUDIO_VERIFIED_BASE_CHECKPOINTS,
] as const satisfies readonly VerifiedBaseModelCheckpoint[];

const hasLegacyCompletionsRoute = (
  endpoints: readonly string[] | undefined
): boolean =>
  endpoints?.some((endpoint) => {
    const path = endpoint.toLowerCase().split(/[?#]/, 1)[0]?.replace(/\/$/, '');
    return path === 'completions' || path?.endsWith('/v1/completions') === true;
  }) === true;

const isLoopbackConnection = (endpoint: string | undefined): boolean => {
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};

const matchesVerifiedLocalCheckpoint = (
  entry: BaseModelCatalogEntry,
  checkpoint: VerifiedBaseModelCheckpoint
): boolean =>
  checkpoint.provider === 'lmstudio' &&
  checkpoint.publisher === entry.publisher &&
  (checkpoint.localKeys?.includes(entry.id) === true ||
    checkpoint.weightIdentity === entry.artifactIdentifier);

/**
 * Whether a catalog row has positive, exact evidence that it is a base model.
 * Heuristics such as `llm`, names, tool support or prompt templates are ignored.
 */
export const isEligibleBaseModel = (
  provider: Provider,
  entry: BaseModelCatalogEntry,
  verifiedCheckpoints: readonly VerifiedBaseModelCheckpoint[] = VERIFIED_BASE_MODEL_CHECKPOINTS
): boolean => {
  if (provider === 'openrouter') {
    const checkpoint = verifiedCheckpoints.find(
      (candidate) =>
        candidate.provider === 'openrouter' && candidate.catalogId === entry.id
    );
    return (
      checkpoint !== undefined &&
      entry.weightIdentity === checkpoint.weightIdentity &&
      entry.outputModalities?.includes('text') === true &&
      hasLegacyCompletionsRoute(entry.endpoints)
    );
  }

  if (provider !== 'lmstudio') return false;

  if (entry.id === 'mock-base' || entry.publisher === 'mock') {
    return (
      entry.id === 'mock-base' &&
      entry.publisher === 'mock' &&
      isLoopbackConnection(entry.connectionEndpoint)
    );
  }

  return verifiedCheckpoints.some((checkpoint) =>
    matchesVerifiedLocalCheckpoint(entry, checkpoint)
  );
};

/** Pure, fail-closed catalog selector for the later buffer-model screen. */
export const selectEligibleBaseModels = <Entry extends BaseModelCatalogEntry>(
  provider: Provider,
  catalog: readonly Entry[] | null | undefined,
  verifiedCheckpoints: readonly VerifiedBaseModelCheckpoint[] = VERIFIED_BASE_MODEL_CHECKPOINTS
): readonly Entry[] =>
  catalog?.filter((entry) =>
    isEligibleBaseModel(provider, entry, verifiedCheckpoints)
  ) ?? [];
