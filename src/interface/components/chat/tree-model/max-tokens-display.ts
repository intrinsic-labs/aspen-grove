import { formatTokensFull } from '../../models/model-info-format';

/** What Maximum Output Tokens reads when the agent sets none. */
export const PROVIDER_DEFAULT_LABEL = 'Provider default';

/** The value row's text: the number, or that the provider decides. */
export const maxTokensLabel = (maxTokens: number | null): string =>
  maxTokens === null ? PROVIDER_DEFAULT_LABEL : formatTokensFull(maxTokens);

/**
 * Where the slider's thumb sits. With no value set, the provider's default
 * (LM Studio: up to the context; OpenRouter: the model's own limit) is
 * uncapped, so the thumb rests at the model's maximum; dragging sets one.
 */
export const maxTokensSliderValue = (
  maxTokens: number | null,
  maxAllowed: number
): number => maxTokens ?? maxAllowed;
