import { Link, LinkTargetType } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for Link persistence operations.
 * Infrastructure layer implements this contract.
 *
 * Links are bidirectional references between items (Nodes, LoomTrees, Documents).
 * For connections within a single LoomTree, use Edges instead.
 */
export interface ILinkRepository {
  // === Basic CRUD ===

  /** Find a Link by ID, or null if not found. */
  findById(id: ULID): Promise<Link | null>;

  /** Create a new Link. */
  create(input: CreateLinkInput): Promise<Link>;

  /** Update a Link's label. */
  updateLabel(id: ULID, label: string | null): Promise<Link>;

  /** Delete a Link by ID. */
  delete(id: ULID): Promise<boolean>;

  /**
   * Remove Links where source or target no longer exists.
   * Typically called during cleanup/maintenance.
   * @returns Count of deleted Links.
   */
  deleteOrphaned(groveId: ULID): Promise<number>;

  // === Queries ===

  /** Find all links in a grove. */
  findByGroveId(groveId: ULID): Promise<Link[]>;

  /**
   * Find all links where the given item is either source or target.
   * Returns both directions since links are bidirectional.
   */
  findByItem(itemType: LinkTargetType, itemId: ULID): Promise<Link[]>;

  /**
   * Find all links originating from a specific item.
   * Use when you only want outbound links.
   */
  findBySource(sourceType: LinkTargetType, sourceId: ULID): Promise<Link[]>;

  /**
   * Find all links pointing to a specific item.
   * Use when you only want inbound links.
   */
  findByTarget(targetType: LinkTargetType, targetId: ULID): Promise<Link[]>;

  /**
   * Check if a link exists between two items (in either direction).
   */
  existsBetween(
    itemAType: LinkTargetType,
    itemAId: ULID,
    itemBType: LinkTargetType,
    itemBId: ULID
  ): Promise<boolean>;

  /**
   * Find a specific link between two items (in either direction).
   */
  findBetween(
    itemAType: LinkTargetType,
    itemAId: ULID,
    itemBType: LinkTargetType,
    itemBId: ULID
  ): Promise<Link | null>;
}

/** Input for creating a new Link. */
export type CreateLinkInput = {
  readonly groveId: ULID;
  readonly sourceType: LinkTargetType;
  readonly sourceId: ULID;
  readonly targetType: LinkTargetType;
  readonly targetId: ULID;
  readonly label?: string;
};
