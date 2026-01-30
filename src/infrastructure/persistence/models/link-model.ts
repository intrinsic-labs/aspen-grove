/**
 * Link WatermelonDB Model
 *
 * Represents a bidirectional reference between any two items.
 * Used for cross-tree and cross-document references.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import type { Link, LinkableType, Ulid, Timestamp } from '../../../domain';

/**
 * WatermelonDB model for Link entities.
 *
 * Links provide cross-tree and cross-document references,
 * distinct from Edges which connect nodes within a single Loom Tree.
 */
export class LinkModel extends Model {
  static table = 'links';

  /** Reference to parent Grove */
  @field('grove_id') groveId!: string;

  /** Type of the source item: 'node' | 'loomTree' | 'document' */
  @field('source_type') sourceType!: string;

  /** Reference to the source item */
  @field('source_id') sourceId!: string;

  /** Type of the target item: 'node' | 'loomTree' | 'document' */
  @field('target_type') targetType!: string;

  /** Reference to the target item */
  @field('target_id') targetId!: string;

  /** Optional label describing the relationship */
  @field('label') label!: string | null;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain Link entity.
   */
  toDomain(): Link {
    return {
      id: this.id as Ulid,
      groveId: this.groveId as Ulid,
      sourceType: this.sourceType as LinkableType,
      sourceId: this.sourceId as Ulid,
      targetType: this.targetType as LinkableType,
      targetId: this.targetId as Ulid,
      label: this.label,
      createdAt: this.createdAt.getTime() as Timestamp,
    };
  }
}
