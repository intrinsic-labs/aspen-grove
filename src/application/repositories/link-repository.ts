/**
 * Link Repository Interface
 *
 * Abstract contract for Link persistence operations.
 * Links are bidirectional references between items (Nodes, LoomTrees, Documents).
 *
 * Note: This interface is defined in Phase 1 for architectural completeness,
 * but full implementation is deferred to Phase 5 (Tree Operations).
 */

import type { Link, CreateLinkInput, LinkedItemRef, LinkableType, Ulid } from '../../domain';

/**
 * Link repository interface.
 *
 * Handles persistence for Link entities. Links provide cross-tree and
 * cross-document references, distinct from Edges which connect nodes
 * within a single Loom Tree.
 */
export interface ILinkRepository {
  /**
   * Create a new bidirectional Link between two items.
   *
   * @param input - Link creation parameters
   * @returns The created Link
   */
  create(input: CreateLinkInput): Promise<Link>;

  /**
   * Find a Link by ID.
   *
   * @param id - Link ULID
   * @returns The Link or null if not found
   */
  findById(id: Ulid): Promise<Link | null>;

  /**
   * Find all Links originating from a specific item.
   *
   * @param sourceType - Type of the source item
   * @param sourceId - ULID of the source item
   * @returns Array of Links where the item is the source
   */
  findBySource(sourceType: LinkableType, sourceId: Ulid): Promise<Link[]>;

  /**
   * Find all Links pointing to a specific item.
   *
   * @param targetType - Type of the target item
   * @param targetId - ULID of the target item
   * @returns Array of Links where the item is the target
   */
  findByTarget(targetType: LinkableType, targetId: Ulid): Promise<Link[]>;

  /**
   * Find all Links connected to an item (as source OR target).
   *
   * Useful for showing all connections in a knowledge graph view.
   *
   * @param itemType - Type of the item
   * @param itemId - ULID of the item
   * @returns Array of all Links involving this item
   */
  findConnections(itemType: LinkableType, itemId: Ulid): Promise<Link[]>;

  /**
   * Delete a Link.
   *
   * @param id - Link ULID
   * @returns true if deletion succeeded
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Delete all Links where source or target no longer exists.
   *
   * Maintenance operation to clean up orphaned Links.
   *
   * @returns Count of deleted Links
   */
  deleteOrphaned(): Promise<number>;

  /**
   * Delete all Links involving a specific item.
   *
   * Used when deleting an entity to cascade delete its Links.
   *
   * @param itemType - Type of the item being deleted
   * @param itemId - ULID of the item being deleted
   * @returns Count of deleted Links
   */
  deleteByItem(itemType: LinkableType, itemId: Ulid): Promise<number>;

  /**
   * Find all Links in a Grove.
   *
   * @param groveId - Grove ULID
   * @returns Array of all Links in the Grove
   */
  findByGrove(groveId: Ulid): Promise<Link[]>;

  /**
   * Count Links for an item.
   *
   * @param itemType - Type of the item
   * @param itemId - ULID of the item
   * @returns Number of Links involving this item
   */
  countForItem(itemType: LinkableType, itemId: Ulid): Promise<number>;
}
