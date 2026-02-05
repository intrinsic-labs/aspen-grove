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
