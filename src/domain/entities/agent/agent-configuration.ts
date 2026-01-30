/**
 * Agent Configuration
 *
 * Configuration settings for model agents.
 * These settings control how the model generates responses.
 * Ignored for human agents.
 */

/**
 * Configuration options for an Agent.
 * Applied when the agent generates content.
 */
export interface AgentConfiguration {
  /** System prompt prepended to context for this agent */
  readonly systemPrompt: string | null;

  /** Temperature setting (0.0-2.0), controls randomness */
  readonly temperature: number | null;

  /** Maximum tokens in response */
  readonly maxTokens: number | null;

  /** Stop sequences that halt generation */
  readonly stopSequences: readonly string[];

  /** Provider-specific custom parameters */
  readonly customParameters: Readonly<Record<string, unknown>>;
}

/**
 * Default configuration values
 */
export const DEFAULT_AGENT_CONFIGURATION: AgentConfiguration = {
  systemPrompt: null,
  temperature: null,
  maxTokens: null,
  stopSequences: [],
  customParameters: {},
};

/**
 * Create an AgentConfiguration with defaults for unspecified fields
 */
export function createAgentConfiguration(
  partial: Partial<AgentConfiguration> = {}
): AgentConfiguration {
  return {
    ...DEFAULT_AGENT_CONFIGURATION,
    ...partial,
    // Ensure arrays and objects are new references
    stopSequences: partial.stopSequences
      ? [...partial.stopSequences]
      : DEFAULT_AGENT_CONFIGURATION.stopSequences,
    customParameters: partial.customParameters
      ? { ...partial.customParameters }
      : DEFAULT_AGENT_CONFIGURATION.customParameters,
  };
}

/**
 * Type guard for AgentConfiguration
 */
export function isAgentConfiguration(value: unknown): value is AgentConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    (config.systemPrompt === null || typeof config.systemPrompt === 'string') &&
    (config.temperature === null || typeof config.temperature === 'number') &&
    (config.maxTokens === null || typeof config.maxTokens === 'number') &&
    Array.isArray(config.stopSequences) &&
    typeof config.customParameters === 'object' &&
    config.customParameters !== null
  );
}
