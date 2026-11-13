import type { OpenRouterCatalogModel } from '@application/services/llm';
import { formatPriceSummary } from './model-price-format';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** A token count for a list row: 1M, 1.05M, 200K, 512. */
export const formatTokensCompact = (tokens: number): string => {
  if (tokens >= 1_000_000) {
    return `${Number((tokens / 1_000_000).toFixed(2))}M`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return String(tokens);
};

/** A token count in full, grouped by thousands: "1,048,576". */
export const formatTokensFull = (tokens: number): string =>
  String(Math.round(tokens)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Unix seconds as a UTC date: "Nov 9, 2026". */
export const formatUnixDate = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
};

/** `YYYY-MM-DD` as "Mar 1, 2026"; anything else as given. */
export const formatIsoDay = (isoDay: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${Number(match[3])}, ${match[1]}` : isoDay;
};

/** Modalities as words: ["text", "image"] → "Text, Image". */
export const formatModalities = (modalities: readonly string[]): string =>
  modalities
    .map((modality) => modality.charAt(0).toUpperCase() + modality.slice(1))
    .join(', ');

export type ModelName = {
  /** The model's own name, e.g. "Claude Sonnet 5.5". */
  readonly title: string;
  /** Who made it, e.g. "Anthropic". */
  readonly author: string;
};

/**
 * OpenRouter names a model "Author: Model". Split that; without an author
 * in the name, the id's first segment (`unbiased/pareto-26.10`) says who.
 */
export const splitModelName = (
  model: Pick<OpenRouterCatalogModel, 'id' | 'displayName'>
): ModelName => {
  const separator = model.displayName.indexOf(': ');
  if (separator > 0) {
    return {
      author: model.displayName.slice(0, separator),
      title: model.displayName.slice(separator + 2),
    };
  }
  const slug = model.id.replace(/^~/, '');
  const slash = slug.indexOf('/');
  return {
    author: slash > 0 ? slug.slice(0, slash) : 'OpenRouter',
    title: model.displayName,
  };
};

/** A list row's meta line: "1M context · $3/M in · $15/M out". */
export const formatRowMeta = (model: OpenRouterCatalogModel): string =>
  [
    model.contextLength
      ? `${formatTokensCompact(model.contextLength)} context`
      : null,
    formatPriceSummary(model),
  ]
    .filter(Boolean)
    .join(' · ');

/** The model's page on openrouter.ai; an alias opens the model it names. */
export const openRouterModelUrl = (
  model: Pick<OpenRouterCatalogModel, 'id' | 'aliasOf'>
): string => `https://openrouter.ai/${model.aliasOf ?? model.id}`;
