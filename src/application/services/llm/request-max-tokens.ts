import type { Provider } from '@domain/entities';
import type { IModelOutputLimits } from './IModelOutputLimits';

/**
 * The `maxTokens` a request sends: the agent's configured value, capped at
 * the model's output limit when that is known, so a stored value that is too
 * large (an agent moved to a smaller model) never reaches the provider. No
 * configured value stays none (the provider's default). A failed lookup
 * sends the configured value, as before.
 */
export const requestMaxTokens = async (
  configured: number | undefined,
  target: { readonly provider: Provider; readonly model: string },
  limits: IModelOutputLimits
): Promise<number | undefined> => {
  if (configured === undefined) {
    return undefined;
  }
  let limit: number | undefined;
  try {
    limit = await limits.maxOutputTokens(target.provider, target.model);
  } catch {
    return configured;
  }
  return limit !== undefined && limit > 0
    ? Math.min(configured, limit)
    : configured;
};
