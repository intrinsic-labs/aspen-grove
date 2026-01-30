/**
 * Node WatermelonDB Model
 *
 * Represents a Node entity in the database.
 * Handles JSON serialization for content and metadata fields.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { Content, NodeMetadata, AuthorType } from '../../../domain';

/**
 * Sanitizer for content JSON field.
 * Ensures the content object is valid when reading from DB.
 */
const sanitizeContent = (raw: unknown): Content => {
  if (!raw || typeof raw !== 'object') {
    return { type: 'text', text: '' };
  }
  return raw as Content;
};

/**
 * Sanitizer for metadata JSON field.
 * Provides defaults for missing fields.
 */
const sanitizeMetadata = (raw: unknown): NodeMetadata => {
  const defaults: NodeMetadata = {
    bookmarked: false,
    bookmarkLabel: null,
    pruned: false,
    excluded: false,
  };

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const data = raw as Record<string, unknown>;
  return {
    bookmarked: typeof data.bookmarked === 'boolean' ? data.bookmarked : defaults.bookmarked,
    bookmarkLabel: typeof data.bookmarkLabel === 'string' ? data.bookmarkLabel : defaults.bookmarkLabel,
    pruned: typeof data.pruned === 'boolean' ? data.pruned : defaults.pruned,
    excluded: typeof data.excluded === 'boolean' ? data.excluded : defaults.excluded,
  };
};

/**
 * WatermelonDB Model for Node entity.
 *
 * Note: WatermelonDB uses snake_case for column names.
 * The decorators map these to camelCase properties.
 */
export class NodeModel extends Model {
  static table = 'nodes';

  /** Tree-unique short identifier (6-8 chars) */
  @field('local_id') localId!: string;

  /** Reference to parent LoomTree */
  @field('loom_tree_id') loomTreeId!: string;

  /** Node content (stored as JSON) */
  @json('content', sanitizeContent) content!: Content;

  /** Auto-generated summary (null until generated) */
  @field('summary') summary!: string | null;

  /** Reference to the authoring Agent */
  @field('author_agent_id') authorAgentId!: string;

  /** Author type for hash verification ('human' | 'model') */
  @field('author_type') authorType!: AuthorType;

  /** SHA-256 content hash for tamper evidence */
  @field('content_hash') contentHash!: string;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /** Metadata fields stored as JSON for flexibility */
  @json('metadata', sanitizeMetadata) metadata!: NodeMetadata;

  /** Buffer Mode: reference to original node (for version nodes) */
  @field('edited_from') editedFrom!: string | null;
}
