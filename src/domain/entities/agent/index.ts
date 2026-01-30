/**
 * Agent Module
 *
 * Exports Agent entity and related types.
 */

export type { Agent, CreateAgentInput, UpdateAgentInput, AgentFilters } from './agent';
export { isHumanAgent, isModelAgent, parseModelRef, createModelRef } from './agent';

export type { AgentConfiguration } from './agent-configuration';
export {
  DEFAULT_AGENT_CONFIGURATION,
  createAgentConfiguration,
  isAgentConfiguration,
} from './agent-configuration';

export type { AgentPermissions } from './agent-permissions';
export {
  DEFAULT_AGENT_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  createAgentPermissions,
  isAgentPermissions,
} from './agent-permissions';

export type { ModelCapabilities } from './model-capabilities';
export {
  DEFAULT_MODEL_CAPABILITIES,
  createModelCapabilities,
  isModelCapabilities,
  canHandleContentType,
} from './model-capabilities';
