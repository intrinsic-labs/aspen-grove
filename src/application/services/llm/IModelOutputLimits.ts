import type { Provider } from '@domain/entities';

/**
 * Where generation learns how many output tokens a model accepts per
 * request. Implemented in infrastructure (OpenRouter's cached catalog) and
 * injected into the use cases that send requests.
 */
export interface IModelOutputLimits {
  /**
   * The most output tokens `model` accepts per request on `provider`, or
   * undefined when the app doesn't know. Should answer from what is already
   * at hand rather than wait on the network.
   */
  maxOutputTokens(
    provider: Provider,
    model: string
  ): Promise<number | undefined>;
}
