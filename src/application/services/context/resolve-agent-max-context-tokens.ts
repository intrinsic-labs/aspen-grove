import type { Agent } from '@domain/entities';

/**
 * Resolves the model context window (in tokens) for an agent.
 *
 * The domain model does not yet track per-model context limits, so this
 * reads an optional `maxContextTokens` custom parameter from the agent
 * configuration. Returns undefined when unset or invalid; callers fall
 * back to DEFAULT_MAX_CONTEXT_TOKENS.
 */
export const resolveAgentMaxContextTokens = (
  agent: { readonly configuration: Agent['configuration'] } | null | undefined
): number | undefined => {
  const value = agent?.configuration.customParameters?.['maxContextTokens'];
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
};
