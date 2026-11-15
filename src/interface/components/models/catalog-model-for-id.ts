import type { ModelOption } from './model-options';

const findById = (
  options: readonly ModelOption[],
  id: string
): ModelOption | undefined =>
  options.find((option) => option.id === id) ??
  options.find((option) => option.id.toLowerCase() === id.toLowerCase());

/**
 * The listed model an id names, for its limits: the listed id itself, else
 * the same id in another case, else the model a routing variant is of
 * (OpenRouter's `{model}:{variant}`, such as `:nitro` or `:floor`, when the
 * variant isn't listed in its own right). Undefined for an id nothing listed
 * matches, whose limits stay unknown.
 */
export const catalogModelForId = (
  id: string | null,
  options: readonly ModelOption[]
): ModelOption | undefined => {
  const trimmed = id?.trim();
  if (!trimmed) {
    return undefined;
  }
  const listed = findById(options, trimmed);
  if (listed) {
    return listed;
  }
  const variantAt = trimmed.lastIndexOf(':');
  return variantAt > 0
    ? findById(options, trimmed.slice(0, variantAt))
    : undefined;
};
