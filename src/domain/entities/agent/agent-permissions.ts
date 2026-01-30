/**
 * Agent Permissions
 *
 * Defines what operations an Agent can perform within Aspen Grove.
 */

/**
 * Permissions that control Agent capabilities.
 */
export interface AgentPermissions {
  /** Can view Loom Trees and content */
  readonly read: boolean;

  /** Can create Nodes, Edges, and perform tree operations */
  readonly write: boolean;
}

/**
 * Default permissions for new Agents (full access)
 */
export const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  read: true,
  write: true,
};

/**
 * Create an AgentPermissions object with defaults for unspecified fields
 */
export function createAgentPermissions(
  partial: Partial<AgentPermissions> = {}
): AgentPermissions {
  return {
    ...DEFAULT_AGENT_PERMISSIONS,
    ...partial,
  };
}

/**
 * Read-only permissions preset
 */
export const READ_ONLY_PERMISSIONS: AgentPermissions = {
  read: true,
  write: false,
};

/**
 * Type guard for AgentPermissions
 */
export function isAgentPermissions(value: unknown): value is AgentPermissions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const perms = value as Record<string, unknown>;

  return typeof perms.read === 'boolean' && typeof perms.write === 'boolean';
}
