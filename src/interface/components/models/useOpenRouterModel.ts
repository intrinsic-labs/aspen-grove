import { useModelPickerData } from './useModelPickerData';

/**
 * One model from the cached OpenRouter catalog, for its page in the
 * browser. `loading` until the catalog has settled.
 */
export const useOpenRouterModel = (id: string | undefined) => {
  const picker = useModelPickerData('openrouter');
  const option = id
    ? picker.options.find((candidate) => candidate.id === id)
    : undefined;
  return {
    option,
    model: option?.openRouter,
    loading: picker.loading || picker.settledFor !== 'openrouter',
    error: picker.error,
  };
};
