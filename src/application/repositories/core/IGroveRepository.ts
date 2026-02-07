import { Grove } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for Grove persistence operations.
 * Infrastructure layer implements this contract.
 *
 * Note: MVP assumes single Grove per user. Methods support
 * multiple Groves for future extensibility.
 */
export interface IGroveRepository {
  // === Basic CRUD ===

  /** Find a Grove by ID, or null if not found. */
  findById(id: ULID): Promise<Grove | null>;

  /** Find the Grove owned by an agent. Single Grove per user in MVP. */
  findByOwnerAgentId(ownerAgentId: ULID): Promise<Grove | null>;

  /** Create a new Grove. */
  create(input: CreateGroveInput): Promise<Grove>;

  /** Update a Grove's mutable fields. */
  update(input: UpdateGroveInput): Promise<Grove>;

  /** Permanently delete a Grove and all contained data. Use with caution. */
  hardDelete(id: ULID): Promise<boolean>;
}

/** Input for creating a new Grove. */
export type CreateGroveInput = {
  readonly name: string;
  /** Reference to the owning human Agent. */
  readonly ownerAgentId: ULID;
};

/** Input for updating a Grove's mutable fields. */
export type UpdateGroveInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
  };
};
