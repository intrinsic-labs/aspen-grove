import { formatRowMeta, splitModelName } from './model-info-format';
import { filterModelOptions } from './model-option-filter';
import type { ModelOption } from './model-options';

export type BrowserRow = {
  readonly id: string;
  readonly title: string;
  readonly author?: string;
  readonly meta?: string;
};

/** What a row shows: OpenRouter's name split from its author, and figures. */
export const toBrowserRow = (option: ModelOption): BrowserRow => {
  if (!option.openRouter) {
    return { id: option.id, title: option.label, meta: option.detail };
  }
  const { title, author } = splitModelName(option.openRouter);
  return {
    id: option.id,
    title,
    author,
    meta: formatRowMeta(option.openRouter) || undefined,
  };
};

/**
 * The browser's rows: every model matching the search (by id or name,
 * author included), by name, so one maker's models sit together.
 */
export const browserRows = (
  options: readonly ModelOption[],
  search: string
): readonly BrowserRow[] =>
  filterModelOptions(
    [...options].sort((a, b) => a.label.localeCompare(b.label)),
    search,
    Number.POSITIVE_INFINITY
  ).map(toBrowserRow);
