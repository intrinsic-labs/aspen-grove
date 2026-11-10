import {
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_AGENT_TEMPERATURE,
} from '@application/services/agent-defaults';
import type { AgentDraft } from '../settings/agents/agent-editor-types';

/**
 * A readable agent name from an LM Studio model key: the last path segment
 * (`qwen/qwen3-8b` → `qwen3-8b`), or the whole key if it has none.
 */
export const lmStudioAgentName = (modelId: string): string => {
  const trimmed = modelId.trim();
  const lastSegment = trimmed.split('/').filter(Boolean).pop();
  return lastSegment ?? trimmed;
};

/** The agent onboarding creates for a model discovered in LM Studio. */
export const lmStudioAgentDraft = (modelId: string): AgentDraft => ({
  name: lmStudioAgentName(modelId),
  provider: 'lmstudio',
  modelIdentifier: modelId.trim(),
  temperatureInput: String(DEFAULT_AGENT_TEMPERATURE),
  maxTokensInput: '',
  systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
});
