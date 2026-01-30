/**
 * Agent Repository Interface
 *
 * Abstract contract for Agent persistence operations.
 * Agents represent participants in Loom Tree interactions (humans and models).
 */

import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentFilters,
  AuthorType,
  Ulid,
} from '../../domain';
import type { Pagination, PaginatedResult } from './common';
import type { Observable, Subscription, Observer } from './loom-tree-repository';

/**
 * Agent repository interface.
 *
 * Manages persistence for Agent entities. Agents are the unified abstraction
 * for both humans and models that can participate in Loom Tree interactions.
 */
export interface IAgentRepository {
  /**
   * Create a new Agent.
   *
   * For model agents, modelRef must be provided.
   * For human agents, modelRef must be null.
   *
   * @param input - Agent creation parameters
   * @returns The created Agent
   * @throws ValidationError if modelRef constraints are violated
   */
  create(input: CreateAgentInput): Promise<Agent>;

  /**
   * Find an Agent by ID.
   *
   * @param id - Agent ULID
   * @returns The Agent or null if not found
   */
  findById(id: Ulid): Promise<Agent | null>;

  /**
   * List Agents by type with optional filtering and pagination.
   *
   * @param type - Agent type (human or model)
   * @param filters - Optional filters
   * @param pagination - Optional pagination parameters
   * @returns Paginated list of Agents
   */
  findByType(
    type: AuthorType,
    filters?: AgentFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Agent>>;

  /**
   * Find all Agents using a specific model reference.
   *
   * Useful for finding all Agent configurations for a given model.
   *
   * @param modelRef - Model reference string (e.g., 'anthropic:claude-sonnet-4-20250514')
   * @returns Array of Agents using this model
   */
  findByModelRef(modelRef: string): Promise<Agent[]>;

  /**
   * Update Agent properties.
   *
   * Cannot change type or modelRef after creation (required for stable hash verification).
   *
   * @param id - Agent ULID
   * @param changes - Properties to update
   * @returns The updated Agent
   * @throws NotFoundError if Agent doesn't exist
   */
  update(id: Ulid, changes: UpdateAgentInput): Promise<Agent>;

  /**
   * Soft-delete an Agent (set archivedAt).
   *
   * @param id - Agent ULID
   * @returns true if successful
   * @throws NotFoundError if Agent doesn't exist
   */
  archive(id: Ulid): Promise<boolean>;

  /**
   * Restore an archived Agent (clear archivedAt).
   *
   * @param id - Agent ULID
   * @returns true if successful
   * @throws NotFoundError if Agent doesn't exist
   */
  restore(id: Ulid): Promise<boolean>;

  /**
   * Find the owner (human) Agent for the app.
   *
   * Returns the primary human Agent referenced by Grove.ownerAgentId.
   * There is exactly one owner Agent per app installation.
   *
   * @returns The owner Agent
   * @throws NotFoundError if owner Agent hasn't been created yet
   */
  findOwner(): Promise<Agent>;

  /**
   * Find all active (non-archived) Agents.
   *
   * @param filters - Optional filters
   * @returns Array of active Agents
   */
  findActive(filters?: AgentFilters): Promise<Agent[]>;

  /**
   * Check if an Agent exists.
   *
   * @param id - Agent ULID
   * @returns true if the Agent exists
   */
  exists(id: Ulid): Promise<boolean>;

  /**
   * Count Agents by type.
   *
   * @param type - Optional type filter (omit for all types)
   * @param filters - Optional additional filters
   * @returns Count of matching Agents
   */
  count(type?: AuthorType, filters?: AgentFilters): Promise<number>;

  // ============================================
  // Observable Methods (for reactive UI updates)
  // ============================================

  /**
   * Observe an Agent for changes.
   *
   * Returns an observable that emits whenever the Agent is updated.
   *
   * @param id - Agent ULID
   * @returns Observable of Agent updates
   */
  observe(id: Ulid): Observable<Agent | null>;

  /**
   * Observe all active model Agents.
   *
   * Returns an observable that emits when any model Agent changes.
   * Useful for model selection UIs.
   *
   * @returns Observable of model Agent arrays
   */
  observeModelAgents(): Observable<Agent[]>;
}

export type { Observable, Subscription, Observer };
