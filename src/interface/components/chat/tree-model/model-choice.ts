import type { TreeModelSettingsChanges } from '@application/use-cases';
import type { SelectableProvider } from '@domain/entities';
import { parseModelRef } from '@domain/value-objects';
import type { ModelOption } from '../../settings/agents/model-options';
import { maxTokensAllowed } from './tree-model-values';

/**
 * Choosing a model: the new model, and with "Always use maximum allowed" on,
 * its own limit (TreeModelSettingsView.swift:171-175).
 */
export const modelChoiceChanges = (
  provider: SelectableProvider,
  modelId: string,
  option: ModelOption | undefined,
  useMaxTokens: boolean
): TreeModelSettingsChanges => ({
  modelRef: parseModelRef(`${provider}:${modelId}`),
  ...(useMaxTokens ? { maxTokens: maxTokensAllowed(option) } : {}),
});
