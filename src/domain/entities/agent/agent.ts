/**
 * Agent Entity
 *
 * Represents any participant that can interact with a Loom Tree.
 * Both humans and models are represented as Agents, enabling
 * uniform tree operations regardless of who/what is behind them.
 */

import type { Ulid, Timestamp } from '../base';
import { AuthorType } from '../base';
import type { AgentConfiguration } from './agent-configuration';
import type { AgentPermissions } from './agent-permissions';

/**
 * Agent entity - a participant in Loom Tree interactions.
 *
 * Key characteristics:
 * - Unified abstraction for humans and models
 * - Type is immutable after creation (for stable hash verification)
 * - Model agents reference a model via modelRef
 * - Configuration controls generation behavior (models only)
 * - Loom-aware agents can access tree navigation tools
 */
export interface Agent {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Display name */
  readonly name: string;

  /**
   * Agent type - human or model.
   * Immutable after creation for stable hash verification.
   */
  readonly type: AuthorType;

  /**
   * Model reference for model agents.
   * Format: '{provider}:{identifier}' for remote models
   * Format: 'local:{ulid}' for local models
   * Must be null for human agents.
   */
  readonly modelRef: string | null;

  /** Configuration settings (used for model agents) */
  readonly configuration: AgentConfiguration;

  /** Permission settings */
  readonly permissions: AgentPermissions;

  /**
   * Whether this agent can access tree navigation tools.
   * Defaults to true for humans, false for models.
   */
  readonly loomAware: boolean;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;

  /** Soft delete timestamp, null if active */
  readonly archivedAt: Timestamp | null;
}

/**
 * Input for creating a new Agent
 */
export interface CreateAgentInput {
  /** ULID for the new agent (pre-generated) */
  id: Ulid;

  /** Display name */
  name: string;

  /** Agent type */
  type: AuthorType;

  /**
   * Model reference (required for model agents, must be null for human agents)
   */
  modelRef: string | null;

  /** Optional configuration (defaults applied if not provided) */
  configuration?: Partial<AgentConfiguration>;

  /** Optional permissions (defaults applied if not provided) */
  permissions?: Partial<AgentPermissions>;

  /** Loom-aware setting (defaults based on type) */
  loomAware?: boolean;
}

/**
 * Input for updating an Agent
 */
export interface UpdateAgentInput {
  /** New display name */
  name?: string;

  /** New configuration */
  configuration?: Partial<AgentConfiguration>;

  /** New permissions */
  permissions?: Partial<AgentPermissions>;

  /** New loom-aware setting */
  loomAware?: boolean;
}

/**
 * Filters for querying agents
 */
export interface AgentFilters {
  /** Filter by agent type */
  type?: AuthorType;

  /** Filter by archive status */
  archived?: boolean;

  /** Filter by loom-aware setting */
  loomAware?: boolean;
}

/**
 * Check if an agent is a human
 */
export function isHumanAgent(agent: Agent): boolean {
  return agent.type === AuthorType.Human;
}

/**
 * Check if an agent is a model
 */
export function isModelAgent(agent: Agent): boolean {
  return agent.type === AuthorType.Model;
}

/**
 * Parse a model reference into provider and identifier
 */
export function parseModelRef(modelRef: string): {
  provider: string;
  identifier: string;
} | null {
  const colonIndex = modelRef.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  return {
    provider: modelRef.slice(0, colonIndex),
    identifier: modelRef.slice(colonIndex + 1),
  };
}

/**
 * Create a model reference string
 */
export function createModelRef(provider: string, identifier: string): string {
  return `${provider}:${identifier}`;
}
