import type { MockConfig } from './config.ts';

/** What happens to one completion request. */
export type RequestPlan =
  | { readonly kind: 'ok' }
  | { readonly kind: 'missing-model' }
  | { readonly kind: 'status'; readonly status: number }
  | { readonly kind: 'drop'; readonly afterTokens: number };

/**
 * Decides a completion request's fate from its 1-based number and model.
 * The missing model always answers 404; otherwise every `failEvery`th
 * request fails in the configured mode.
 */
export const planRequest = (
  config: Pick<
    MockConfig,
    'missingModelId' | 'failEvery' | 'failMode' | 'failStatus' | 'dropAfter'
  >,
  requestNumber: number,
  model: string
): RequestPlan => {
  if (model === config.missingModelId) {
    return { kind: 'missing-model' };
  }
  if (config.failEvery > 0 && requestNumber % config.failEvery === 0) {
    return config.failMode === 'drop'
      ? { kind: 'drop', afterTokens: config.dropAfter }
      : { kind: 'status', status: config.failStatus };
  }
  return { kind: 'ok' };
};
