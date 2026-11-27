import {
  MissingProviderKeyError,
  type OpenRouterCatalogModel,
} from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';
import type { LMStudioModel } from '@infrastructure/llm';
import type { AppServices } from '@interface/composition';
import { formatRowMeta, formatTokensCompact } from './model-info-format';
import { PROVIDER_LABELS } from './provider-options';

/**
 * A pickable model, normalized across providers.
 * `id` is the bare identifier (no `{provider}:` prefix).
 */
export type ModelOption = {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  /** OpenRouter's description, in Markdown. */
  readonly description?: string;
  /**
   * The most output tokens a request may ask for: a catalog's limit, or LM
   * Studio's context length.
   */
  readonly maxOutputTokens?: number;
  /** LM Studio only: whether the model is currently loaded on the server. */
  readonly loaded?: boolean;
  /** Who made the model, for a provider whose names don't say (Anthropic, OpenAI). */
  readonly author?: string;
  /** OpenRouter, Anthropic and OpenAI: the catalog entry, for the model browser. */
  readonly catalog?: OpenRouterCatalogModel;
};

const formatContext = (contextLength?: number): string | null =>
  contextLength ? `${formatTokensCompact(contextLength)} ctx` : null;

const joinDetail = (parts: readonly (string | null)[]): string | undefined =>
  parts.filter(Boolean).join(' · ') || undefined;

export const catalogModelOption = (
  model: OpenRouterCatalogModel,
  author?: string
): ModelOption => ({
  id: model.id,
  label: model.displayName,
  description: model.description,
  maxOutputTokens: model.maxCompletionTokens,
  detail: formatRowMeta(model) || undefined,
  author,
  catalog: model,
});

export const lmStudioModelOption = (model: LMStudioModel): ModelOption => ({
  id: model.id,
  label: model.displayName,
  maxOutputTokens: model.maxContextLength,
  detail: joinDetail([
    formatContext(model.maxContextLength),
    model.paramsString ?? null,
  ]),
  loaded: model.state === 'loaded',
});

/**
 * The provider's models as options: the cached OpenRouter catalog, Anthropic's
 * or OpenAI's own list (read with the stored key), or the LLMs an LM Studio
 * server reports.
 */
export const fetchModelOptions = async (
  adapters: Pick<
    AppServices['adapters'],
    'openRouterCatalog' | 'providerRegistry' | 'credentialStore'
  >,
  provider: SelectableProvider,
  forceRefresh: boolean
): Promise<readonly ModelOption[]> => {
  if (provider === 'openrouter') {
    const models = await adapters.openRouterCatalog.getModels({ forceRefresh });
    return models.map((model) => catalogModelOption(model));
  }
  if (provider === 'anthropic' || provider === 'openai') {
    const apiKey = (
      await adapters.credentialStore.getProviderApiKey(provider)
    )?.trim();
    if (!apiKey) {
      throw new MissingProviderKeyError(provider);
    }
    const adapter =
      provider === 'anthropic'
        ? adapters.providerRegistry.getAnthropicAdapter()
        : adapters.providerRegistry.getOpenAIAdapter();
    await adapter.initialize({ apiKey });
    const models = await adapter.fetchModels();
    return models.map((model) =>
      catalogModelOption(model, PROVIDER_LABELS[provider])
    );
  }
  const models = await adapters.providerRegistry
    .getLMStudioAdapter()
    .fetchModels();
  return models
    .filter((model) => model.type === 'llm')
    .map(lmStudioModelOption);
};
