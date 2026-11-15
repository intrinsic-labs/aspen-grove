import type { SelectableProvider } from '@domain/entities';
import type { ModelOption } from './model-options';
import { AGENT_TEMPLATES } from '../settings/agents/agent-templates';

/** The Provider picker's items. Latent Spaces' Anthropic is cut. */
export const PROVIDER_OPTIONS: readonly {
  readonly value: SelectableProvider;
  readonly label: string;
}[] = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'lmstudio', label: 'LM Studio' },
];

/**
 * The model a tree switches to with its provider. Latent Spaces takes the
 * model new trees last used on that provider, else its default
 * (TreeModelSettingsView.swift:38-51); Aspen Grove takes the default
 * agent's model when it is on that provider, else onboarding's first
 * template for OpenRouter, else for LM Studio a loaded model, else the
 * first listed. Null when there is nothing to pick.
 */
export const providerDefaultModel = (
  provider: SelectableProvider,
  options: readonly ModelOption[],
  defaultAgentModel: { readonly provider: string; readonly id: string } | null
): string | null => {
  if (defaultAgentModel?.provider === provider) {
    return defaultAgentModel.id;
  }
  if (provider === 'openrouter') {
    return AGENT_TEMPLATES[0]?.draft.modelIdentifier ?? options[0]?.id ?? null;
  }
  return (options.find((option) => option.loaded) ?? options[0])?.id ?? null;
};
