/**
 * Grove Entity
 *
 * The top-level container for all user data.
 * In MVP, there is exactly one Grove per user.
 */

import type { Ulid, Timestamp, UpdatableEntity } from '../base';

/**
 * Grove entity - the root container for all user content.
 *
 * Key characteristics:
 * - One Grove per user (MVP)
 * - Contains all Loom Trees and Documents
 * - Owned by a human Agent
 * - Created automatically on first launch
 */
export interface Grove extends UpdatableEntity {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Display name (default: "My Grove") */
  readonly name: string;

  /** Reference to the owner (human) Agent */
  readonly ownerAgentId: Ulid;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;
}

/**
 * Input for creating a new Grove
 */
export interface CreateGroveInput {
  /** ULID for the new grove (pre-generated) */
  id: Ulid;

  /** Display name (optional, defaults to "My Grove") */
  name?: string;

  /** Owner Agent reference (must be a human agent) */
  ownerAgentId: Ulid;
}

/**
 * Update input for Grove
 */
export interface UpdateGroveInput {
  /** New display name */
  name?: string;
}
