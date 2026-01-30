/**
 * LoomTree Repository Interface
 *
 * Abstract contract for LoomTree persistence operations.
 * LoomTrees are the core data structure for branching conversations.
 */

import type {
  LoomTree,
  CreateLoomTreeInput,
  UpdateLoomTreeInput,
  LoomTreeFilters,
  Ulid,
} from '../../domain';
import type { Pagination, PaginatedResult } from './common';

/**
 * LoomTree repository interface.
 *
 * Manages persistence of LoomTrees and their metadata.
 * Node and Edge operations are handled by their respective repositories.
 */
export interface ILoomTreeRepository {
  /**
   * Create a new LoomTree with its root Node.
   *
   * This is an atomic operation that creates:
   * 1. The LoomTree entity
   * 2. A root Node (with optional initial content)
   *
   * @param input - LoomTree creation parameters
   * @returns The created LoomTree with rootNodeId populated
   */
  create(input: CreateLoomTreeInput): Promise<LoomTree>;

  /**
   * Find a LoomTree by ID.
   *
   * @param id - LoomTree ULID
   * @returns The LoomTree or null if not found
   */
  findById(id: Ulid): Promise<LoomTree | null>;

  /**
   * List LoomTrees in a Grove with optional filtering and pagination.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters
   * @param pagination - Optional pagination parameters
   * @returns Paginated array of LoomTrees
   */
  findByGrove(
    groveId: Ulid,
    filters?: LoomTreeFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<LoomTree>>;

  /**
   * Update LoomTree metadata.
   *
   * Note: Mode cannot be changed after creation.
   * Summary is managed via regenerateSummary, not direct update.
   *
   * @param id - LoomTree ULID
   * @param changes - Properties to update
   * @returns The updated LoomTree
   * @throws NotFoundError if LoomTree doesn't exist
   */
  update(id: Ulid, changes: UpdateLoomTreeInput): Promise<LoomTree>;

  /**
   * Regenerate the LoomTree summary.
   *
   * Gathers node summaries from primary path and branch points,
   * includes user-edited description, and generates a new summary.
   *
   * @param id - LoomTree ULID
   * @returns The updated LoomTree
   * @throws NotFoundError if LoomTree doesn't exist
   * @throws NotImplementedError until LLM integration (Phase 2/4)
   */
  regenerateSummary(id: Ulid): Promise<LoomTree>;

  /**
   * Soft-delete a LoomTree (set archivedAt).
   *
   * @param id - LoomTree ULID
   * @returns true if successful
   * @throws NotFoundError if LoomTree doesn't exist
   */
  archive(id: Ulid): Promise<boolean>;

  /**
   * Restore an archived LoomTree (clear archivedAt).
   *
   * @param id - LoomTree ULID
   * @returns true if successful
   * @throws NotFoundError if LoomTree doesn't exist
   */
  restore(id: Ulid): Promise<boolean>;

  /**
   * Hard-delete a LoomTree and all related data.
   *
   * This is a destructive operation that removes:
   * - The LoomTree entity
   * - All Nodes in the tree
   * - All Edges in the tree
   * - Related provenance records
   * - Related media files
   *
   * @param id - LoomTree ULID
   * @returns true if successful
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Check if a LoomTree exists.
   *
   * @param id - LoomTree ULID
   * @returns true if the LoomTree exists
   */
  exists(id: Ulid): Promise<boolean>;

  /**
   * Get the count of LoomTrees in a Grove.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters (e.g., exclude archived)
   * @returns Number of matching LoomTrees
   */
  count(groveId: Ulid, filters?: LoomTreeFilters): Promise<number>;

  // ============================================
  // Observable Methods (for reactive UI updates)
  // ============================================

  /**
   * Observe a LoomTree by ID.
   *
   * Returns an observable that emits the current LoomTree state
   * and re-emits whenever the LoomTree is updated.
   *
   * @param id - LoomTree ULID
   * @returns Observable of LoomTree (or null if deleted)
   */
  observeById(id: Ulid): Observable<LoomTree | null>;

  /**
   * Observe LoomTrees in a Grove.
   *
   * Returns an observable that emits the current list of LoomTrees
   * and re-emits whenever any LoomTree in the Grove changes.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters
   * @returns Observable of LoomTree array
   */
  observeByGrove(
    groveId: Ulid,
    filters?: LoomTreeFilters
  ): Observable<LoomTree[]>;
}

/**
 * Minimal Observable interface for reactive queries.
 *
 * Compatible with RxJS Observable or any similar reactive stream.
 * WatermelonDB provides these natively.
 */
export interface Observable<T> {
  /**
   * Subscribe to value changes.
   *
   * @param observer - Callback or observer object
   * @returns Subscription with unsubscribe method
   */
  subscribe(observer: ((value: T) => void) | Observer<T>): Subscription;
}

/**
 * Observer interface for Observable subscriptions.
 */
export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

/**
 * Subscription returned from Observable.subscribe()
 */
export interface Subscription {
  /** Stop receiving updates */
  unsubscribe(): void;
}
