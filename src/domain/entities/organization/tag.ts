/**
 * Tag Entity
 *
 * A label for organization and filtering.
 * Tags can be applied to Nodes, LoomTrees, and Documents.
 */

import type { Ulid, Timestamp, LinkableType } from '../base';

/**
 * Tag entity - a label for organizing content.
 *
 * Key characteristics:
 * - Names are unique within a Grove (case-sensitive)
 * - Can have an optional color for UI display
 * - Applied to items via TagAssignment junction entity
 */
export interface Tag {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to parent Grove */
  readonly groveId: Ulid;

  /** The tag text (e.g., "research", "claude", "important") */
  readonly name: string;

  /** Optional hex color for UI display (e.g., "#FF5733") */
  readonly color: string | null;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a new Tag
 */
export interface CreateTagInput {
  /** ULID for the new tag (pre-generated) */
  id: Ulid;

  /** Parent Grove reference */
  groveId: Ulid;

  /** Tag name (must be unique within Grove) */
  name: string;

  /** Optional color */
  color?: string;
}

/**
 * Input for updating a Tag
 */
export interface UpdateTagInput {
  /** New name (must remain unique within Grove) */
  name?: string;

  /** New color */
  color?: string | null;
}

/**
 * TagAssignment - junction entity connecting Tags to items.
 *
 * Key characteristics:
 * - One tag can be assigned to many items
 * - One item can have many tags
 * - Duplicate assignments (same tag + same target) are not allowed
 */
export interface TagAssignment {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to the Tag */
  readonly tagId: Ulid;

  /** Type of the tagged item */
  readonly targetType: LinkableType;

  /** Reference to the tagged item */
  readonly targetId: Ulid;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a TagAssignment
 */
export interface CreateTagAssignmentInput {
  /** ULID for the new assignment (pre-generated) */
  id: Ulid;

  /** Tag to assign */
  tagId: Ulid;

  /** Type of target item */
  targetType: LinkableType;

  /** Target item to tag */
  targetId: Ulid;
}

/**
 * Reference to a tagged item (for query results)
 */
export interface TaggedItemRef {
  /** Type of the item */
  readonly type: LinkableType;

  /** ID of the item */
  readonly id: Ulid;
}
