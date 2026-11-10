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
 * Quick-start templates for new agents, all routed through OpenRouter.
 * Templates are starting points, not presets: the user can edit every field
 * before saving, and they are never auto-instantiated. The first one is the
 * default that onboarding preselects.
 *
 * Model ids use OpenRouter's `~…-latest` aliases, which always resolve to
 * the newest model in a family, so the templates don't go stale. Checked
 * against https://openrouter.ai/api/v1/models on 2026-11-09.
 */
export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
  template(
    'claude-sonnet-balanced',
    'Claude Sonnet (Balanced)',
    '~anthropic/claude-sonnet-latest',
    0.7
  ),
  template(
    'claude-sonnet-creative',
    'Claude Sonnet (Creative)',
    '~anthropic/claude-sonnet-latest',
    1.2
  ),
  template(
    'claude-haiku-fast',
    'Claude Haiku (Fast)',
    '~anthropic/claude-haiku-latest',
    0.7
  ),
  template(
    'gpt-sol-balanced',
    'GPT Sol (Balanced)',
    '~openai/gpt-sol-latest',
    0.7
  ),
];

/** The template onboarding starts from. */
export const DEFAULT_AGENT_TEMPLATE: AgentTemplate = AGENT_TEMPLATES[0];
