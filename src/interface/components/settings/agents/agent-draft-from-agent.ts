import {
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_AGENT_TEMPERATURE,
} from '@application/services/agent-defaults';
import {
  isSelectableProvider,
  type Agent,
  type SelectableProvider,
} from '@domain/entities';
import type { AgentDraft } from './agent-editor-types';

/** A new agent's draft: OpenRouter, no model yet, the default settings. */
export const EMPTY_AGENT_DRAFT: AgentDraft = {
  name: '',
  provider: 'openrouter',
  modelIdentifier: '',
  temperatureInput: String(DEFAULT_AGENT_TEMPERATURE),
  maxTokensInput: '',
  systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
};

/**
 * Split an agent's modelRef into picker-friendly parts. Unknown providers
 * (e.g. a future `anthropic:` ref) fall back to showing the full ref as an
 * OpenRouter custom identifier rather than crashing the editor.
 */
export const draftFromAgent = (agent: Agent): AgentDraft => {
  const modelRef = agent.modelRef ?? '';
  const colonIndex = modelRef.indexOf(':');
  const prefix = colonIndex === -1 ? '' : modelRef.slice(0, colonIndex);
  const provider: SelectableProvider = isSelectableProvider(prefix)
    ? prefix
    : 'openrouter';
  const modelIdentifier = isSelectableProvider(prefix)
    ? modelRef.slice(colonIndex + 1)
    : modelRef;

  return {
    name: agent.name,
    provider,
    modelIdentifier,
    temperatureInput:
      typeof agent.configuration.temperature === 'number'
        ? String(agent.configuration.temperature)
        : String(DEFAULT_AGENT_TEMPERATURE),
    maxTokensInput:
      typeof agent.configuration.maxTokens === 'number'
        ? String(agent.configuration.maxTokens)
        : '',
    systemPrompt:
      agent.configuration.systemPrompt ?? DEFAULT_AGENT_SYSTEM_PROMPT,
  };
};
