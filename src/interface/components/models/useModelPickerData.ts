import { useCallback, useEffect, useRef, useState } from 'react';
import { describeProviderError } from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { fetchModelOptions, type ModelOption } from './model-options';

export type { ModelOption } from './model-options';

/**
 * Unified model-list data source for the agent editor and a tree's Model
 * Settings: the OpenRouter catalog (24h-cached) or live LM Studio discovery,
 * depending on provider. `settledFor` names the provider whose list last
 * finished loading, or failing; a late answer for a provider no longer
 * asked for is dropped.
 */
export const useModelPickerData = (provider: SelectableProvider) => {
  const { adapters } = useAppServices();
  const [options, setOptions] = useState<readonly ModelOption[]>([]);
  const [settledFor, setSettledFor] = useState<SelectableProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(
    async (forceRefresh = false) => {
      const request = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const next = await fetchModelOptions(adapters, provider, forceRefresh);
        if (request === latestRequest.current) {
          setOptions(next);
          setSettledFor(provider);
        }
      } catch (caught) {
        if (request === latestRequest.current) {
          setOptions([]);
          setSettledFor(provider);
          // Plain words for an LM Studio server that isn't running.
          setError(describeProviderError(caught, { provider }).message);
        }
      } finally {
        if (request === latestRequest.current) {
          setLoading(false);
        }
      }
    },
    [adapters, provider]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    options,
    settledFor,
    loading,
    error,
    refresh: useCallback(() => load(true), [load]),
  };
};
