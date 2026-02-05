import { Agent, AgentConfiguration, AgentPermissions, AgentType } from '@domain/entities';
import { ModelRef, ULID } from '@domain/value-objects';

/**
 * Repository interface for Agent persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface IAgentRepository {
  // === Basic CRUD ===

  /** Find an Agent by ID, or null if not found. */
  findById(id: ULID): Promise<Agent | null>;

  /** Create a new Agent. */
  create(input: CreateAgentInput): Promise<Agent>;

  /** Update an Agent's mutable fields. */
  update(input: UpdateAgentInput): Promise<Agent>;

  /** Soft delete by setting archivedAt timestamp. */
  archive(id: ULID): Promise<Agent>;

  /** Restore a previously archived agent. */
  restore(id: ULID): Promise<Agent>;

  /** Permanently delete an Agent. */
  hardDelete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find all agents, optionally filtered by type. */
  findAll(onlyActive?: boolean, type?: AgentType): Promise<Agent[]>;

  /** Find all human agents. */
  findHumans(onlyActive?: boolean): Promise<Agent[]>;

  /** Find all model agents. */
  findModels(onlyActive?: boolean): Promise<Agent[]>;

  /** Find agents by model reference (e.g., all agents using 'anthropic:claude-sonnet-4-20250514'). */
  findByModelRef(modelRef: ModelRef, onlyActive?: boolean): Promise<Agent[]>;

  /** Find agents with specific permissions. */
  findLoomAware(onlyActive?: boolean): Promise<Agent[]>;
}

/** Input for creating a new Agent. */
export type CreateAgentInput = {
  readonly name: string;
  /** Type is immutable after creation. */
  readonly type: AgentType;
  /** Required for model agents, must be undefined for human agents. */
  readonly modelRef?: ModelRef;
  readonly configuration?: AgentConfiguration;
  readonly permissions?: AgentPermissions;
};

/** Input for updating an Agent's mutable fields. */
export type UpdateAgentInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    readonly modelRef?: ModelRef;
    readonly configuration?: AgentConfiguration;
    readonly permissions?: AgentPermissions;
  };
};
