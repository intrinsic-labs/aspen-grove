/**
 * Document WatermelonDB Model
 *
 * Represents a Document entity in the database.
 * Documents are mutable rich-text containers for notes and artifacts.
 */

import { Model } from '@nozbe/watermelondb';
import { field, json, writer } from '@nozbe/watermelondb/decorators';
import type { Document, DocumentBlock, Ulid, Timestamp } from '../../../domain';

/**
 * Sanitizer for blocks JSON field.
 * Ensures the data is always a valid array of DocumentBlock objects.
 */
function sanitizeBlocks(raw: unknown): DocumentBlock[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  // Basic validation - ensure each block has a type
  return raw.filter(
    (block): block is DocumentBlock =>
      typeof block === 'object' &&
      block !== null &&
      typeof (block as Record<string, unknown>).type === 'string'
  );
}

/**
 * WatermelonDB model for Document entities.
 *
 * Documents are mutable (unlike Nodes) and support rich block-based content
 * including text, images, audio, headings, code, callouts, and embeds.
 */
export class DocumentModel extends Model {
  static table = 'documents';

  /** Reference to parent Grove */
  @field('grove_id') groveId!: string;

  /** Display name */
  @field('title') title!: string;

  /** Auto-generated summary (null until generated) */
  @field('summary') summary!: string | null;

  /** Ordered array of content blocks (stored as JSON) */
  @json('blocks', sanitizeBlocks) blocks!: DocumentBlock[];

  /** Creation timestamp in milliseconds */
  @field('created_at') createdAt!: number;

  /** Last update timestamp in milliseconds */
  @field('updated_at') updatedAt!: number;

  /** Soft delete timestamp (null if active) */
  @field('archived_at') archivedAt!: number | null;

  /**
   * Convert this model to a domain Document entity.
   */
  toDomain(): Document {
    return {
      id: this.id as Ulid,
      groveId: this.groveId as Ulid,
      title: this.title,
      summary: this.summary,
      blocks: this.blocks,
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
   * Update the blocks (replaces entire array).
   */
  @writer async updateBlocks(blocks: DocumentBlock[]): Promise<void> {
    await this.update((record) => {
      record.blocks = blocks;
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
   * Archive this document.
   */
  @writer async archive(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = Date.now();
      record.updatedAt = Date.now();
    });
  }

  /**
   * Restore this document from archive.
   */
  @writer async restore(): Promise<void> {
    await this.update((record) => {
      record.archivedAt = null;
      record.updatedAt = Date.now();
    });
  }
}
