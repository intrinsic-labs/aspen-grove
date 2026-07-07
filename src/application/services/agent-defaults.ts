import type { AgentPermissions } from '@domain/entities';

/**
 * Shared defaults for newly created model Agents.
 *
 * These replace the per-provider constants that used to live in the
 * (removed) singleton assistant-agent helpers. Agent creation flows —
 * the Settings → Agents library and chat-side forks — start from these
 * and let the user customize from there.
 */
export const DEFAULT_AGENT_SYSTEM_PROMPT =
  'You are a helpful dialogue partner in Aspen Grove.';

export const DEFAULT_AGENT_TEMPERATURE = 1.0;

export const DEFAULT_MODEL_AGENT_PERMISSIONS: AgentPermissions = {
  loomAware: false,
  loomWrite: true,
  loomGenerate: false,
  docRead: true,
  docWrite: false,
};
