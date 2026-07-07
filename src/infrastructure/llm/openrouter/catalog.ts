import { fetch as expoFetch } from 'expo/fetch';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CATALOG_TIMEOUT_MS = 15000;

/**
 * A model listed in the OpenRouter public catalog, normalized for picker UI.
 */
export type OpenRouterCatalogModel = {
  /** OpenRouter model identifier, e.g. `anthropic/claude-sonnet-4.5`. */
  readonly id: string;
  readonly displayName: string;
  readonly contextLength?: number;
  /** USD per million prompt tokens. */
  readonly promptPricePerMTokens?: number;
  /** USD per million completion tokens. */
  readonly completionPricePerMTokens?: number;
};

type OpenRouterApiModel = {
  readonly id: string;
  readonly name?: string;
  readonly context_length?: number | null;
  readonly pricing?: {
    readonly prompt?: string;
    readonly completion?: string;
  };
};

const toPricePerMTokens = (perToken?: string): number | undefined => {
  if (perToken === undefined) {
    return undefined;
  }
  const parsed = Number(perToken);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed * 1_000_000;
};

const normalizeModel = (apiModel: OpenRouterApiModel): OpenRouterCatalogModel => ({
  id: apiModel.id,
  displayName: apiModel.name ?? apiModel.id,
  contextLength: apiModel.context_length ?? undefined,
  promptPricePerMTokens: toPricePerMTokens(apiModel.pricing?.prompt),
  completionPricePerMTokens: toPricePerMTokens(apiModel.pricing?.completion),
});

/**
 * Fetch the public OpenRouter model catalog. No API key required.
 * Returns models sorted alphabetically by id.
 */
export const fetchOpenRouterCatalog = async (input?: {
  readonly timeoutMs?: number;
}): Promise<OpenRouterCatalogModel[]> => {
  const timeoutMs = input?.timeoutMs ?? CATALOG_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await expoFetch(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter catalog request failed (${response.status})`
      );
    }

    const payload = (await response.json()) as {
      readonly data?: readonly OpenRouterApiModel[];
    };
    const models = (payload.data ?? [])
      .filter((model) => typeof model.id === 'string' && model.id.length > 0)
      .map(normalizeModel);

    return models.sort((a, b) => a.id.localeCompare(b.id));
  } finally {
    clearTimeout(timeoutId);
  }
};
