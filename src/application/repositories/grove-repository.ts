/**
 * Grove Repository Interface
 *
 * Abstract contract for Grove persistence operations.
 * The Grove is the top-level container for all user data (MVP: one per user).
 */

import type { Grove, CreateGroveInput, UpdateGroveInput, Ulid } from '../../domain';

/**
 * Grove repository interface.
 *
 * In MVP, there is exactly one Grove per user. The Grove is created
 * automatically on first app launch and persists for the app lifetime.
 */
export interface IGroveRepository {
  /**
   * Create a new Grove.
   *
   * @param input - Grove creation parameters
   * @returns The created Grove
   */
  create(input: CreateGroveInput): Promise<Grove>;

  /**
   * Find a Grove by ID.
   *
   * @param id - Grove ULID
   * @returns The Grove or null if not found
   */
  findById(id: Ulid): Promise<Grove | null>;

  /**
   * Find the Grove owned by a specific Agent.
   *
   * In MVP, there is one Grove per user, so this returns the user's Grove.
   *
   * @param ownerAgentId - Owner Agent ULID
   * @returns The Grove or null if not found
   */
  findByOwner(ownerAgentId: Ulid): Promise<Grove | null>;

  /**
   * Update Grove properties.
   *
   * @param id - Grove ULID
   * @param changes - Properties to update
   * @returns The updated Grove
   * @throws NotFoundError if Grove doesn't exist
   */
  update(id: Ulid, changes: UpdateGroveInput): Promise<Grove>;

  /**
   * Check if a Grove exists.
   *
   * Useful for initialization checks without loading the full entity.
   *
   * @param id - Grove ULID
   * @returns true if the Grove exists
   */
  exists(id: Ulid): Promise<boolean>;

  /**
   * Get the single Grove for the app (MVP convenience method).
   *
   * Returns the first (and only) Grove, or null if none exists.
   * Useful during initialization.
   *
   * @returns The Grove or null if not initialized
   */
  getDefault(): Promise<Grove | null>;
}
