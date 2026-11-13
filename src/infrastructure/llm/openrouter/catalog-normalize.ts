import type { OpenRouterCatalogModel } from '@application/services/llm';

/**
 * One model as `GET https://openrouter.ai/api/v1/models` returns it: the
 * fields the app reads. Prices are strings of USD per token (or per request
 * for `request`); a router's are "-1".
 */
export type OpenRouterApiModel = {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly created?: number | null;
  readonly context_length?: number | null;
  readonly knowledge_cutoff?: string | null;
  readonly alias_target?: { readonly slug?: string } | null;
  readonly architecture?: {
    readonly input_modalities?: readonly string[] | null;
    readonly output_modalities?: readonly string[] | null;
  } | null;
  readonly top_provider?: {
    readonly max_completion_tokens?: number | null;
  } | null;
  readonly pricing?: {
    readonly prompt?: string;
    readonly completion?: string;
    readonly image?: string;
    readonly image_output?: string;
    readonly request?: string;
  } | null;
  readonly supported_parameters?: readonly string[] | null;
};

const MILLION = 1_000_000;

const toUsd = (value?: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const perMillion = (perToken?: string): number | undefined => {
  const usd = toUsd(perToken);
  return usd === undefined ? undefined : usd * MILLION;
};

/** A request price of 0 is no request price; leave it out. */
const nonZero = (usd?: number): number | undefined =>
  usd === undefined || usd === 0 ? undefined : usd;

const nonEmpty = (
  list?: readonly string[] | null
): readonly string[] | undefined =>
  list && list.length > 0 ? [...list] : undefined;

const isNegative = (value?: string): boolean =>
  value !== undefined && Number(value) < 0;

/** An API model as the app keeps it (see `OpenRouterCatalogModel`). */
export const normalizeOpenRouterModel = (
  api: OpenRouterApiModel
): OpenRouterCatalogModel => {
  const pricing = api.pricing ?? {};
  const model: OpenRouterCatalogModel = {
    id: api.id,
    displayName: api.name || api.id,
    description: api.description || undefined,
    contextLength: api.context_length ?? undefined,
    maxCompletionTokens: api.top_provider?.max_completion_tokens ?? undefined,
    promptPricePerMTokens: perMillion(pricing.prompt),
    completionPricePerMTokens: perMillion(pricing.completion),
    imagePricePerMTokens: perMillion(pricing.image),
    imageOutputPricePerMTokens: perMillion(pricing.image_output),
    requestPrice: nonZero(toUsd(pricing.request)),
    variablePricing:
      isNegative(pricing.prompt) || isNegative(pricing.completion) || undefined,
    created: api.created ?? undefined,
    inputModalities: nonEmpty(api.architecture?.input_modalities),
    outputModalities: nonEmpty(api.architecture?.output_modalities),
    supportedParameters: nonEmpty(api.supported_parameters),
    knowledgeCutoff: api.knowledge_cutoff || undefined,
    aliasOf: api.alias_target?.slug || undefined,
  };
  // Drop absent fields so the cached JSON stays small.
  return Object.fromEntries(
    Object.entries(model).filter(([, value]) => value !== undefined)
  ) as OpenRouterCatalogModel;
};
