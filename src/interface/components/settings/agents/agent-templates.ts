import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@application/services/agent-defaults';
import type { AgentDraft } from './agent-editor-types';

export type AgentTemplate = {
  readonly key: string;
  readonly label: string;
  readonly draft: AgentDraft;
};

const template = (
  key: string,
  label: string,
  modelIdentifier: string,
  temperature: number
): AgentTemplate => ({
  key,
  label,
  draft: {
    name: label,
    provider: 'openrouter',
    modelIdentifier,
    temperatureInput: String(temperature),
    maxTokensInput: '',
    systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
  },
});

/**
 * Quick-start templates for new agents. All OpenRouter-routed for now —
 * native provider keys are a future expansion (see agents model doc).
 * Templates are starting points, not presets: the user can edit every field
 * before saving, and they are never auto-instantiated.
 */
export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
  template(
    'claude-sonnet-balanced',
    'Claude Sonnet (Balanced)',
    'anthropic/claude-sonnet-4.5',
    0.7
  ),
  template(
    'claude-sonnet-creative',
    'Claude Sonnet (Creative)',
    'anthropic/claude-sonnet-4.5',
    1.2
  ),
  template(
    'claude-haiku-fast',
    'Claude Haiku (Fast)',
    'anthropic/claude-haiku-4.5',
    0.7
  ),
  template('gpt-4o-balanced', 'GPT-4o (Balanced)', 'openai/gpt-4o', 0.7),
];
