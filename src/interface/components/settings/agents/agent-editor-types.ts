import type { SelectableProvider } from '@domain/entities';

/**
 * In-progress form state for creating or editing a model Agent.
 * `modelIdentifier` is stored without the `{provider}:` prefix; the editor
 * assembles the full modelRef on save.
 */
export type AgentDraft = {
  readonly name: string;
  readonly provider: SelectableProvider;
  readonly modelIdentifier: string;
  readonly temperatureInput: string;
  readonly maxTokensInput: string;
  readonly systemPrompt: string;
};

export type AgentDraftValidationError = string;

export const validateAgentDraft = (
  draft: AgentDraft
): AgentDraftValidationError | null => {
  if (draft.name.trim().length === 0) {
    return 'Give the agent a name.';
  }
  if (draft.modelIdentifier.trim().length === 0) {
    return 'Pick a model for this agent.';
  }

  const temperature = Number(draft.temperatureInput.replace(',', '.').trim());
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    return 'Temperature must be a number between 0.0 and 2.0.';
  }

  const maxTokensRaw = draft.maxTokensInput.trim();
  if (maxTokensRaw.length > 0) {
    const maxTokens = Number(maxTokensRaw);
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      return 'Max tokens must be a positive whole number.';
    }
  }

  return null;
};

export const parsedDraftNumbers = (
  draft: AgentDraft
): { temperature: number; maxTokens?: number } => {
  const temperature = Number(draft.temperatureInput.replace(',', '.').trim());
  const maxTokensRaw = draft.maxTokensInput.trim();
  return {
    temperature,
    maxTokens: maxTokensRaw.length > 0 ? Number(maxTokensRaw) : undefined,
  };
};
