import { Tag, TagAssignment, TaggableType } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for Tag and TagAssignment persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface ITagRepository {
  // === Tag CRUD ===

  /** Find a Tag by ID, or null if not found. */
  findTagById(id: ULID): Promise<Tag | null>;

  /** Find a Tag by name within a Grove (case-sensitive). */
  findTagByName(groveId: ULID, name: string): Promise<Tag | null>;

  /** Create a new Tag. */
  createTag(input: CreateTagInput): Promise<Tag>;

  /** Update a Tag's mutable fields. */
  updateTag(input: UpdateTagInput): Promise<Tag>;

  /** Permanently delete a Tag and all its assignments. */
  deleteTag(id: ULID): Promise<boolean>;

  // === Tag Queries ===

  /** Find all tags in a grove. */
  findTagsByGroveId(groveId: ULID): Promise<Tag[]>;

  /** Find tags assigned to a specific item. */
  findTagsForItem(targetType: TaggableType, targetId: ULID): Promise<Tag[]>;

  // === Assignment Operations ===

  /** Assign a tag to an item. No-op if already assigned. */
  assignTag(tagId: ULID, targetType: TaggableType, targetId: ULID): Promise<TagAssignment>;

  /** Remove a tag from an item. Returns true if assignment existed. */
  unassignTag(tagId: ULID, targetType: TaggableType, targetId: ULID): Promise<boolean>;

  /** Find all assignments for a tag (items with this tag). */
  findAssignmentsByTagId(tagId: ULID): Promise<TagAssignment[]>;

  /** Find all assignments for an item (tags on this item). */
  findAssignmentsByItem(targetType: TaggableType, targetId: ULID): Promise<TagAssignment[]>;

  // === Bulk Operations ===

  /** Find all items with a specific tag, filtered by type. */
  findItemsByTag(tagId: ULID, targetType?: TaggableType): Promise<TagAssignment[]>;

  /** Assign multiple tags to an item at once. */
  assignTags(tagIds: readonly ULID[], targetType: TaggableType, targetId: ULID): Promise<TagAssignment[]>;

  /** Remove all tags from an item. */
  clearTagsFromItem(targetType: TaggableType, targetId: ULID): Promise<boolean>;
}

/** Input for creating a new Tag. */
export type CreateTagInput = {
  readonly groveId: ULID;
  readonly name: string;
  readonly color?: string;
};

/** Input for updating a Tag's mutable fields. */
export type UpdateTagInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    readonly color?: string;
  };
};
