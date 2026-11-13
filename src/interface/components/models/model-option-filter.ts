import type { SelectableProvider } from '@domain/entities';
import type { ModelOption } from './useModelPickerData';

/** At most this many options render at once; search narrows the rest. */
export const MAX_VISIBLE_MODEL_OPTIONS = 25;

/** Options whose id or label contains the search, case-insensitively. */
export const filterModelOptions = (
  options: readonly ModelOption[],
  search: string,
  limit: number = MAX_VISIBLE_MODEL_OPTIONS
): readonly ModelOption[] => {
  const query = search.trim().toLowerCase();
  const matches = query
    ? options.filter(
        (option) =>
          option.id.toLowerCase().includes(query) ||
          option.label.toLowerCase().includes(query)
      )
    : options;
  return matches.slice(0, limit);
};

/**
 * The search text as a custom identifier, when it can be one: OpenRouter
 * only (LM Studio lists what it has), and not already a listed id.
 */
export const customModelIdentifier = (
  provider: SelectableProvider,
  search: string,
  options: readonly ModelOption[]
): string | null => {
  const trimmed = search.trim();
  if (provider !== 'openrouter' || trimmed.length === 0) {
    return null;
  }
  return options.some((option) => option.id === trimmed) ? null : trimmed;
};
