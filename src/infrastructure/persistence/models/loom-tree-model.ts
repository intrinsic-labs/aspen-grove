/**
 * LoomTree WatermelonDB Model
 *
 * Persistence model for LoomTree entities.
 * Maps database columns to domain entity properties.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, text, writer } from '@nozbe/watermelondb/decorators';

import type { LoomTree, LoomTreeMode, Ulid, Timestamp } from '../../../domain';

/**
 * WatermelonDB model for the loom_trees table.
 *
 * Note: WatermelonDB uses snake_case for column names.
 * The decorators handle the mapping automatically.
 */
export class LoomTreeModel extends Model {
  static table = 'loom_trees';

  // Foreign key associations
  static associations = {
    groves: { type: 'belongs_to' as const, key: 'grove_id' },
    nodes: { type: 'has_many' as const, foreignKey: 'loom_tree_id' },
    edges: { type: 'has_many' as const, foreignKey: 'loom_tree_id' },
  };

  @text('grove_id') groveId!: string;
  @text('title') title!: string;
  @text('description') description!: string | null;
  @text('summary') summary!: string | null;
  @text('root_node_id') rootNodeId!: string;
  @text('mode') mode!: string;
  @text('system_context') systemContext!: string | null;

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @field('archived_at') archivedAt!: number | null;

  /**
   * Convert this model to a domain entity.
   */
  toDomain(): LoomTree {
    return {
      id: this.id as Ulid,
      groveId: this.groveId as Ulid,
      title: this.title,
      description: this.description,
      summary: this.summary,
      rootNodeId: this.rootNodeId as Ulid,
      mode: this.mode as LoomTreeMode,
      systemContext: this.systemContext,
      createdAt: this.createdAt as Timestamp,
      updatedAt: this.updatedAt as Timestamp,
      archivedAt: this.archivedAt as Timestamp | null,
    };
  }

  /**
   * Update the title.
   */
  @writer async updateTitle(title: string): Promise<void> {
    await this.update((record) => {
      record.title = title;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update the description.
   */
  @writer async updateDescription(description: string | null): Promise<void> {
    await this.update((record) => {
      record.description = description;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update the system context.
   */
  @writer async updateSystemContext(systemContext: string | null): Promise<void> {
    await this.update((record) => {
      record.systemContext = systemContext;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update the summary.
   */
  @writer async updateSummary(summary: string | null): Promise<void> {
    await this.update((record) => {
      record.summary = summary;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Archive this tree.
   */
  @writer async archive(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = Date.now();
      record.updatedAt = Date.now();
    });
  }

  /**
   * Restore this tree from archive.
   */
  @writer async restore(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = null;
      record.updatedAt = Date.now();
    });
  }
}
