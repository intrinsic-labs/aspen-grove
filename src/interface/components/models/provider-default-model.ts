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
 * template for OpenRouter. On LM Studio only a loaded model is picked (the
 * default agent's, else the first loaded): a model the server lists but
 * hasn't loaded may not answer (a 404 with JIT loading off), so it is left
 * for the user to choose. Null when there is nothing to pick.
 */
export const providerDefaultModel = (
  provider: SelectableProvider,
  options: readonly ModelOption[],
  defaultAgentModel: { readonly provider: string; readonly id: string } | null
): string | null => {
  const agentModelId =
    defaultAgentModel?.provider === provider ? defaultAgentModel.id : null;
  if (provider === 'openrouter') {
    return (
      agentModelId ??
      AGENT_TEMPLATES[0]?.draft.modelIdentifier ??
      options[0]?.id ??
      null
    );
  }
  const loaded = options.filter((option) => option.loaded);
  return (
    (loaded.find((option) => option.id === agentModelId) ?? loaded[0])?.id ??
    null
  );
};
