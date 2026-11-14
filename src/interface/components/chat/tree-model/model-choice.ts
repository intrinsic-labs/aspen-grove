import type { TreeModelSettingsChanges } from '@application/use-cases';
import type { AgentConfiguration, SelectableProvider } from '@domain/entities';
import { parseModelRef } from '@domain/value-objects';
import type { ModelOption } from '../../settings/agents/model-options';
import { maxTokensAllowed, toTreeModelValues } from './tree-model-values';

/**
 * Choosing a model: the new model, and the Maximum Output Tokens the form
 * will show for it. With "Always use maximum allowed" on that is the model's
 * own limit (TreeModelSettingsView.swift:171-175); with it off, the saved
 * value held to the new limit, as Latent Spaces' slider range holds
 * `tree.maxTokens`. Saving what the form shows keeps a request from asking
 * for more than the new model allows.
 */
export const modelChoiceChanges = (
  provider: SelectableProvider,
  modelId: string,
  option: ModelOption | undefined,
  configuration: AgentConfiguration
): TreeModelSettingsChanges => {
  const { maxTokens } = toTreeModelValues(
    configuration,
    maxTokensAllowed(option)
  );
  return {
    modelRef: parseModelRef(`${provider}:${modelId}`),
    ...(maxTokens !== configuration.maxTokens ? { maxTokens } : {}),
  };
};
