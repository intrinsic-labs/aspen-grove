import type { OpenRouterCatalogModel } from '@application/services/llm';

/**
 * USD as OpenRouter's site writes a price: no trailing zeros, three
 * significant digits under $100 ($3, $0.15, $0.075, $1.25), and "Free" for 0.
 */
export const formatUsd = (usd: number): string => {
  if (usd === 0) {
    return 'Free';
  }
  if (usd < 0.0001) {
    return '<$0.0001';
  }
  const rounded = usd >= 100 ? Math.round(usd) : Number(usd.toPrecision(3));
  return `$${rounded}`;
};

/** A per-million-tokens price, e.g. "$3/M"; "Free" stays as it is. */
export const formatPerMillion = (usdPerMTokens: number): string => {
  const usd = formatUsd(usdPerMTokens);
  return usd === 'Free' ? usd : `${usd}/M`;
};

type Prices = Pick<
  OpenRouterCatalogModel,
  'promptPricePerMTokens' | 'completionPricePerMTokens' | 'variablePricing'
>;

/**
 * Input and output price for a list row: "$3/M in · $15/M out", "Free",
 * or "Price varies" for a router. Null when OpenRouter gave no price.
 */
export const formatPriceSummary = (model: Prices): string | null => {
  if (model.variablePricing) {
    return 'Price varies';
  }
  const input = model.promptPricePerMTokens;
  const output = model.completionPricePerMTokens;
  if (input === undefined || output === undefined) {
    return null;
  }
  if (input === 0 && output === 0) {
    return 'Free';
  }
  return `${formatPerMillion(input)} in · ${formatPerMillion(output)} out`;
};

export type PriceLine = { readonly label: string; readonly value: string };

/**
 * The detail page's pricing rows, in OpenRouter's order: input and output
 * per million tokens, then image and per-request prices when the model
 * has them.
 */
export const pricingLines = (
  model: OpenRouterCatalogModel
): readonly PriceLine[] => {
  if (model.variablePricing) {
    return [{ label: 'Price', value: 'Varies by the routed model' }];
  }
  const perM = (label: string, usd?: number): PriceLine | null =>
    usd === undefined
      ? null
      : { label, value: usd === 0 ? 'Free' : `${formatUsd(usd)} / M tokens` };
  return [
    perM('Input', model.promptPricePerMTokens),
    perM('Output', model.completionPricePerMTokens),
    perM('Image input', model.imagePricePerMTokens),
    perM('Image output', model.imageOutputPricePerMTokens),
    model.requestPrice === undefined
      ? null
      : { label: 'Per request', value: formatUsd(model.requestPrice) },
  ].filter((line): line is PriceLine => line !== null);
};
