import { ULID } from '../value-objects';

/**
 * Tag entity
 *
 * A label for organization and filtering.
 * Tag names are unique within a Grove (case-sensitive).
 */
export interface Tag {
  readonly id: ULID;
  readonly groveId: ULID;
  readonly name: string;
  readonly color?: string; // Hex color for UI display
  readonly createdAt: Date;
}

/**
 * TagAssignment entity
 *
 * Junction entity connecting Tags to items.
 * One tag can be assigned to many items; one item can have many tags.
 */
export interface TagAssignment {
  readonly id: ULID;
  readonly tagId: ULID;
  readonly targetType: TaggableType;
  readonly targetId: ULID;
  readonly createdAt: Date;
}

/**
 * Types that can be tagged.
 */
export type TaggableType = 'node' | 'loomTree' | 'document';
