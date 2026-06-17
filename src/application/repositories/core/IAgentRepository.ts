import {
  Agent,
  AgentConfiguration,
  AgentPermissions,
  AgentType,
} from '@domain/entities';
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

  /**
   * Find all agents, optionally filtered by type.
   *
   * By default, excludes tree-owned (private) agents — callers querying for
   * library agents do not want to see ad-hoc per-tree clones. Pass
   * `includeTreeOwned: true` to opt back in (e.g., for diagnostics or
   * cascading deletes).
   */
  findAll(
    onlyActive?: boolean,
    type?: AgentType,
    includeTreeOwned?: boolean
  ): Promise<Agent[]>;

  /** Find all human agents. */
  findHumans(onlyActive?: boolean): Promise<Agent[]>;

  /**
   * Find all model agents (excludes tree-owned by default — see `findAll`).
   */
  findModels(
    onlyActive?: boolean,
    includeTreeOwned?: boolean
  ): Promise<Agent[]>;

  /** Find agents by model reference (e.g., all agents using 'anthropic:claude-sonnet-4-20250514'). */
  findByModelRef(modelRef: ModelRef, onlyActive?: boolean): Promise<Agent[]>;

  /** Find agents with specific permissions. */
  findLoomAware(onlyActive?: boolean): Promise<Agent[]>;

  /**
   * Find the tree-owned agent for a given LoomTree, if any.
   *
   * Used when resolving the agent that should generate for a tree, and when
   * cascading deletes from the tree.
   */
  findByOwnerTreeId(treeId: ULID): Promise<Agent | null>;

  /**
   * Find all shared (library) model agents — those with `ownerTreeId == null`.
   *
   * This is the canonical query for the Settings → Agents list.
   */
  findSharedModels(onlyActive?: boolean): Promise<Agent[]>;
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
  /**
   * When set, marks this agent as private to the referenced LoomTree.
   * See `Agent.ownerTreeId` for semantics.
   */
  readonly ownerTreeId?: ULID;
};

/** Input for updating an Agent's mutable fields. */
export type UpdateAgentInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    readonly modelRef?: ModelRef;
    readonly configuration?: AgentConfiguration;
    readonly permissions?: AgentPermissions;
    /**
     * Set to a tree id to convert a shared agent into a tree-owned one, or to
     * `null` to promote a tree-owned agent into the shared library. Most use
     * cases will not touch this field directly; prefer dedicated use cases.
     */
    readonly ownerTreeId?: ULID | null;
  };
};
