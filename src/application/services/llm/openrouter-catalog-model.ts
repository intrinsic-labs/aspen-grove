/**
 * A model in OpenRouter's public catalog (`GET /api/v1/models`), as the app
 * keeps it: what a picker lists and what a model's detail page shows.
 * Prices are USD; per-token prices are scaled to per million tokens.
 * Fields OpenRouter leaves out, or sends as null, are absent.
 */
export type OpenRouterCatalogModel = {
  /** OpenRouter model identifier, e.g. `anthropic/claude-sonnet-4.5`. */
  readonly id: string;
  /** OpenRouter's name, usually "Author: Model", e.g. "Anthropic: Claude …". */
  readonly displayName: string;
  /** OpenRouter's description, in Markdown (the list endpoint shortens it). */
  readonly description?: string;
  readonly contextLength?: number;
  /** The top provider's output limit (`top_provider.max_completion_tokens`). */
  readonly maxCompletionTokens?: number;
  /** USD per million prompt tokens. */
  readonly promptPricePerMTokens?: number;
  /** USD per million completion tokens. */
  readonly completionPricePerMTokens?: number;
  /** USD per million input image tokens (`pricing.image`). */
  readonly imagePricePerMTokens?: number;
  /** USD per million output image tokens (`pricing.image_output`). */
  readonly imageOutputPricePerMTokens?: number;
  /** USD per request (`pricing.request`). */
  readonly requestPrice?: number;
  /**
   * The price is set per request by a router (OpenRouter sends -1), so
   * there is no fixed per-token price.
   */
  readonly variablePricing?: boolean;
  /** When OpenRouter added the model, in Unix seconds. */
  readonly created?: number;
  /** `architecture.input_modalities`, e.g. `text`, `image`, `file`. */
  readonly inputModalities?: readonly string[];
  readonly outputModalities?: readonly string[];
  /** Request parameters the model accepts, e.g. `temperature`, `tools`. */
  readonly supportedParameters?: readonly string[];
  /** `YYYY-MM-DD`, when OpenRouter knows it. */
  readonly knowledgeCutoff?: string;
  /** A `~…-latest` alias: the id of the model it points to today. */
  readonly aliasOf?: string;
};
