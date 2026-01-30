/**
 * Tag and TagAssignment WatermelonDB Models
 *
 * Tag: A label for organization and filtering.
 * TagAssignment: Junction entity connecting Tags to items (Nodes, LoomTrees, Documents).
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import type { Tag, TagAssignment, LinkableType, Ulid, Timestamp } from '../../../domain';

/**
 * WatermelonDB model for the tags table.
 *
 * Tags can be applied to Nodes, LoomTrees, and Documents for organization.
 * Tag names are unique within a Grove (case-sensitive).
 */
export class TagModel extends Model {
  static table = 'tags';

  /** Reference to parent Grove */
  @field('grove_id') groveId!: string;

  /** Tag name (e.g., "research", "claude", "important") */
  @field('name') name!: string;

  /** Optional hex color for UI display (e.g., "#FF5733") */
  @field('color') color!: string | null;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain Tag entity.
   */
  toDomain(): Tag {
    return {
      id: this.id as Ulid,
      groveId: this.groveId as Ulid,
      name: this.name,
      color: this.color,
      createdAt: this.createdAt.getTime() as Timestamp,
    };
  }
}

/**
 * WatermelonDB model for the tag_assignments table.
 *
 * Junction entity that connects Tags to taggable items.
 * Enforces uniqueness: one tag + one target = one assignment.
 */
export class TagAssignmentModel extends Model {
  static table = 'tag_assignments';

  /** Reference to the Tag */
  @field('tag_id') tagId!: string;

  /** Type of the tagged item: 'node' | 'loomTree' | 'document' */
  @field('target_type') targetType!: string;

  /** Reference to the tagged item */
  @field('target_id') targetId!: string;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain TagAssignment entity.
   */
  toDomain(): TagAssignment {
    return {
      id: this.id as Ulid,
      tagId: this.tagId as Ulid,
      targetType: this.targetType as LinkableType,
      targetId: this.targetId as Ulid,
      createdAt: this.createdAt.getTime() as Timestamp,
    };
  }
}
