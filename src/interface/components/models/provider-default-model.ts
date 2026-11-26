import type { SelectableProvider } from '@domain/entities';
import type { ModelOption } from './model-options';
import { AGENT_TEMPLATES } from '../settings/agents/agent-templates';

/** The listed model the provider added last; the first when none is dated. */
const newestOption = (
  options: readonly ModelOption[]
): ModelOption | undefined =>
  options.reduce<ModelOption | undefined>(
    (newest, option) =>
      !newest || (option.catalog?.created ?? 0) > (newest.catalog?.created ?? 0)
        ? option
        : newest,
    undefined
  );

/**
 * The model a tree switches to with its provider. Latent Spaces takes the
 * model new trees last used on that provider, else its default
 * (TreeModelSettingsView.swift:38-51); Aspen Grove takes the default
 * agent's model when it is on that provider, else onboarding's first
 * template for OpenRouter. On LM Studio only a loaded model is picked (the
 * default agent's, else the first loaded): a model the server lists but
 * hasn't loaded may not answer (a 404 with JIT loading off), so it is left
 * for the user to choose. Anthropic and OpenAI take the default agent's
 * model when it is listed, else their newest listed model. Null when there is
 * nothing to pick.
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
  if (provider === 'anthropic' || provider === 'openai') {
    return (
      options.find((option) => option.id === agentModelId)?.id ??
      newestOption(options)?.id ??
      agentModelId
    );
  }
  const loaded = options.filter((option) => option.loaded);
  return (
    (loaded.find((option) => option.id === agentModelId) ?? loaded[0])?.id ??
    null
  );
};
