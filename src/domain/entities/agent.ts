import { ULID, ModelRef } from '../value-objects';
import { AgentType } from './enums';

/**
 * Agent entity
 */
export interface Agent {
  readonly id: ULID;
  readonly name: string;
  readonly type: AgentType;
  readonly modelRef?: ModelRef;
  readonly configuration: AgentConfiguration;
  readonly permissions: AgentPermissions;
  /**
   * When set, this agent is private to the referenced LoomTree ("tree-owned").
   * Tree-owned agents are filtered out of the shared agent library, are created
   * implicitly when a user customizes dialogue settings inside a chat, and are
   * hard-deleted along with their owning tree.
   *
   * `undefined` (null in storage) = shared / library agent.
   */
  readonly ownerTreeId?: ULID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
}

/**
 * Agent Configuration
 */
export interface AgentConfiguration {
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: string[];
  readonly customParameters?: Record<string, unknown>;
}

/**
 * Agent Permissions
 */
export interface AgentPermissions {
  readonly loomAware: boolean;
  readonly loomWrite: boolean;
  readonly loomGenerate: boolean;
  readonly docRead: boolean;
  readonly docWrite: boolean;
}
