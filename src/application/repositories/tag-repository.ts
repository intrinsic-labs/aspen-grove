/**
 * Tag Repository Interface
 *
 * Abstract contract for Tag and TagAssignment persistence operations.
 * Tags provide organizational structure for Nodes, LoomTrees, and Documents.
 *
 * Note: Full implementation deferred to Phase 5 (Tree Operations).
 * Interface defined now for clean architecture completeness.
 */

import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagAssignment,
  CreateTagAssignmentInput,
  TaggedItemRef,
  LinkableType,
  Ulid,
} from '../../domain';

/**
 * Tag repository interface.
 *
 * Manages persistence for Tag and TagAssignment entities.
 * Tags can be applied to Nodes, LoomTrees, and Documents.
 */
export interface ITagRepository {
  // ============================================
  // Tag Operations
  // ============================================

  /**
   * Create a new Tag.
   *
   * Tag names must be unique within a Grove (case-sensitive).
   *
   * @param input - Tag creation parameters
   * @returns The created Tag
   * @throws ConflictError if tag name already exists in Grove
   */
  createTag(input: CreateTagInput): Promise<Tag>;

  /**
   * Find a Tag by ID.
   *
   * @param id - Tag ULID
   * @returns The Tag or null if not found
   */
  findTagById(id: Ulid): Promise<Tag | null>;

  /**
   * Find a Tag by name within a Grove.
   *
   * @param groveId - Grove ULID
   * @param name - Tag name (exact match)
   * @returns The Tag or null if not found
   */
  findTagByName(groveId: Ulid, name: string): Promise<Tag | null>;

  /**
   * List all Tags in a Grove.
   *
   * @param groveId - Grove ULID
   * @returns Array of Tags
   */
  findTagsByGrove(groveId: Ulid): Promise<Tag[]>;

  /**
   * Update Tag properties.
   *
   * @param id - Tag ULID
   * @param changes - Properties to update
   * @returns The updated Tag
   * @throws NotFoundError if Tag doesn't exist
   * @throws ConflictError if new name conflicts with existing tag
   */
  updateTag(id: Ulid, changes: UpdateTagInput): Promise<Tag>;

  /**
   * Delete a Tag and all its assignments.
   *
   * Removes the Tag entity and all TagAssignments referencing it.
   * Does not affect the tagged items themselves.
   *
   * @param id - Tag ULID
   * @returns true if deletion succeeded
   */
  deleteTag(id: Ulid): Promise<boolean>;

  // ============================================
  // TagAssignment Operations
  // ============================================

  /**
   * Assign a Tag to an item.
   *
   * Idempotent - if assignment already exists, returns existing.
   *
   * @param tagId - Tag ULID
   * @param targetType - Type of item to tag
   * @param targetId - ID of item to tag
   * @returns Created or existing TagAssignment
   */
  assignTag(
    tagId: Ulid,
    targetType: LinkableType,
    targetId: Ulid
  ): Promise<TagAssignment>;

  /**
   * Remove a Tag from an item.
   *
   * Idempotent - no-op if assignment doesn't exist.
   *
   * @param tagId - Tag ULID
   * @param targetType - Type of tagged item
   * @param targetId - ID of tagged item
   * @returns true if assignment was removed (or didn't exist)
   */
  unassignTag(
    tagId: Ulid,
    targetType: LinkableType,
    targetId: Ulid
  ): Promise<boolean>;

  /**
   * Find all Tags assigned to a specific item.
   *
   * @param targetType - Type of item
   * @param targetId - ID of item
   * @returns Array of Tags assigned to the item
   */
  findTagsForItem(targetType: LinkableType, targetId: Ulid): Promise<Tag[]>;

  /**
   * Find all items that have a specific Tag.
   *
   * @param tagId - Tag ULID
   * @param targetType - Optional filter by item type
   * @returns Array of tagged item references
   */
  findItemsWithTag(
    tagId: Ulid,
    targetType?: LinkableType
  ): Promise<TaggedItemRef[]>;

  /**
   * Check if an item has a specific Tag.
   *
   * @param tagId - Tag ULID
   * @param targetType - Type of item
   * @param targetId - ID of item
   * @returns true if item has the tag
   */
  hasTag(
    tagId: Ulid,
    targetType: LinkableType,
    targetId: Ulid
  ): Promise<boolean>;

  /**
   * Remove all tag assignments for an item.
   *
   * Used when deleting an item (cascade cleanup).
   *
   * @param targetType - Type of item
   * @param targetId - ID of item
   * @returns Number of assignments removed
   */
  removeAllTagsFromItem(
    targetType: LinkableType,
    targetId: Ulid
  ): Promise<number>;

  /**
   * Count items with a specific tag.
   *
   * @param tagId - Tag ULID
   * @param targetType - Optional filter by item type
   * @returns Count of items with the tag
   */
  countItemsWithTag(tagId: Ulid, targetType?: LinkableType): Promise<number>;
}
