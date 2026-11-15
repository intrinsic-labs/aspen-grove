import type { OpenRouterCatalogModel } from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';
import type { AppServices } from '@interface/composition';
import { formatRowMeta, formatTokensCompact } from './model-info-format';

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
   * The most output tokens a request may ask for: OpenRouter's top provider
   * limit, or LM Studio's context length.
   */
  readonly maxOutputTokens?: number;
  /** LM Studio only: whether the model is currently loaded on the server. */
  readonly loaded?: boolean;
  /** OpenRouter only: the catalog entry, for the model browser. */
  readonly openRouter?: OpenRouterCatalogModel;
};

const formatContext = (contextLength?: number): string | null =>
  contextLength ? `${formatTokensCompact(contextLength)} ctx` : null;

const joinDetail = (parts: readonly (string | null)[]): string | undefined =>
  parts.filter(Boolean).join(' · ') || undefined;

/**
 * The provider's models as options: the cached OpenRouter catalog, or the
 * LLMs an LM Studio server reports.
 */
export const fetchModelOptions = async (
  adapters: Pick<
    AppServices['adapters'],
    'openRouterCatalog' | 'providerRegistry'
  >,
  provider: SelectableProvider,
  forceRefresh: boolean
): Promise<readonly ModelOption[]> => {
  if (provider === 'openrouter') {
    const models = await adapters.openRouterCatalog.getModels({ forceRefresh });
    return models.map((model) => ({
      id: model.id,
      label: model.displayName,
      description: model.description,
      maxOutputTokens: model.maxCompletionTokens,
      detail: formatRowMeta(model) || undefined,
      openRouter: model,
    }));
  }
  const models = await adapters.providerRegistry
    .getLMStudioAdapter()
    .fetchModels();
  return models
    .filter((model) => model.type === 'llm')
    .map((model) => ({
      id: model.id,
      label: model.displayName,
      maxOutputTokens: model.maxContextLength,
      detail: joinDetail([
        formatContext(model.maxContextLength),
        model.paramsString ?? null,
      ]),
      loaded: model.state === 'loaded',
    }));
};
