import { LoomTree, LoomTreeMode } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for LoomTree persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface ILoomTreeRepository {
  // === Basic CRUD ===

  /** Find a LoomTree by ID, or null if not found. */
  findById(id: ULID): Promise<LoomTree | null>;

  /** Create a new LoomTree. Root node must be created first. */
  create(input: CreateLoomTreeInput): Promise<LoomTree>;

  /** Update mutable fields (title, description, systemContext). */
  update(input: UpdateLoomTreeInput): Promise<LoomTree>;

  /** Soft delete by setting archivedAt timestamp. */
  archive(id: ULID): Promise<LoomTree>;

  /** Restore a previously archived tree. */
  restore(id: ULID): Promise<LoomTree>;

  /**
   * Permanently delete a LoomTree and all associated Nodes/Edges.
   * Implementations must ensure no orphaned data remains.
   */
  hardDelete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find all trees in a grove. Defaults to active (non-archived) only. */
  findByGroveId(
    groveId: ULID,
    onlyActive?: boolean,
    limit?: number,
    offset?: number
  ): Promise<LoomTree[]>;

  /** Find trees by mode within a grove. Defaults to active only. */
  findByMode(
    groveId: ULID,
    mode: LoomTreeMode,
    onlyActive?: boolean,
    limit?: number,
    offset?: number
  ): Promise<LoomTree[]>;

  /**
   * Find all trees that reference a given Agent as their default model agent.
   *
   * Used to:
   * - Block deletion of a shared agent that's still in use
   * - Surface "this change affects N trees" warnings in the chat header UI
   * - Power cascading workflows (e.g., re-pointing trees when an agent goes away)
   */
  findByDefaultModelAgentId(
    modelAgentId: ULID,
    onlyActive?: boolean
  ): Promise<LoomTree[]>;

  /**
   * Record that a dialogue turn (user send or model continuation) landed on
   * this tree at `at`. Sets `lastMessageAt` without moving `updatedAt`, so
   * conversation recency stays distinct from metadata edits.
   */
  touchLastMessage(id: ULID, at: Date): Promise<void>;
}

/** Input for creating a new LoomTree. */
export type CreateLoomTreeInput = {
  /**
   * Optional caller-supplied id.
   * Provide this when dependent entities must reference LoomTree id before persistence.
   */
  readonly id?: ULID;
  readonly groveId: ULID;
  /** Root node must be created beforehand; use case coordinates this. */
  readonly rootNodeId: ULID;
  readonly mode: LoomTreeMode;
  readonly title?: string;
  readonly description?: string;
  readonly systemContext?: string;
  /**
   * The default model Agent this tree generates from. Required at the use-case
   * level for dialogue-mode trees — enforced upstream of the repository.
   */
  readonly defaultModelAgentId?: ULID;
};

/** Input for updating a LoomTree's mutable fields. */
export type UpdateLoomTreeInput = {
  readonly id: ULID;
  readonly changes: {
    readonly title?: string;
    readonly description?: string;
    readonly systemContext?: string;
    /**
     * Switch the tree to a different model Agent. Editing the referenced
     * agent's configuration is a separate operation — see the agent use cases.
     */
    readonly defaultModelAgentId?: ULID;
  };
};
