import type { SelectableProvider } from '@domain/entities';
import { useModelPickerData } from './useModelPickerData';

/**
 * One model from a provider's catalog (OpenRouter's cached one, or
 * Anthropic's or OpenAI's own list), for its page in the browser. `loading`
 * until the list has settled.
 */
export const useCatalogModel = (
  provider: SelectableProvider,
  id: string | undefined
) => {
  const picker = useModelPickerData(provider);
  const option = id
    ? picker.options.find((candidate) => candidate.id === id)
    : undefined;
  return {
    option,
    model: option?.catalog,
    loading: picker.loading || picker.settledFor !== provider,
    error: picker.error,
  };
};
