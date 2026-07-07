import { useCallback, useEffect, useState } from 'react';
import type { SelectableProvider } from '@domain/entities';
import { useAppServices } from '@interface/composition';

/**
 * A pickable model, normalized across providers.
 * `id` is the bare identifier (no `{provider}:` prefix).
 */
export type ModelOption = {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  /** LM Studio only: whether the model is currently loaded on the server. */
  readonly loaded?: boolean;
};

const formatContext = (contextLength?: number): string | null =>
  contextLength ? `${Math.round(contextLength / 1000)}K ctx` : null;

const formatPrice = (perMTokens?: number): string | null => {
  if (perMTokens === undefined) {
    return null;
  }
  if (perMTokens === 0) {
    return 'free';
  }
  return `$${perMTokens < 1 ? perMTokens.toFixed(2) : perMTokens.toFixed(0)}/M`;
};

/**
 * Unified model-list data source for the agent editor: the OpenRouter
 * catalog (24h-cached) or live LM Studio discovery, depending on provider.
 */
export const useModelPickerData = (provider: SelectableProvider) => {
  const { adapters } = useAppServices();
  const [options, setOptions] = useState<readonly ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        if (provider === 'openrouter') {
          const models = await adapters.openRouterCatalog.getModels({
            forceRefresh,
          });
          setOptions(
            models.map((model) => ({
              id: model.id,
              label: model.displayName,
              detail:
                [
                  formatContext(model.contextLength),
                  formatPrice(model.promptPricePerMTokens),
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined,
            }))
          );
        } else {
          const lmstudioAdapter =
            adapters.providerRegistry.getLMStudioAdapter();
          const models = await lmstudioAdapter.fetchModels();
          setOptions(
            models
              .filter((model) => model.type === 'llm')
              .map((model) => ({
                id: model.id,
                label: model.displayName,
                detail:
                  [
                    formatContext(model.maxContextLength),
                    model.paramsString ?? null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined,
                loaded: model.state === 'loaded',
              }))
          );
        }
      } catch (caught) {
        setOptions([]);
        setError(
          caught instanceof Error ? caught.message : 'Failed to load models'
        );
      } finally {
        setLoading(false);
      }
    },
    [adapters.openRouterCatalog, adapters.providerRegistry, provider]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    options,
    loading,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
};
