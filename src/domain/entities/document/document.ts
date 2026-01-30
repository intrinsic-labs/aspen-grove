/**
 * Document Entity
 *
 * A rich, mutable document for notes, reference material, and composed artifacts.
 * Unlike Nodes (which are immutable), Documents can be freely edited.
 */

import type { Ulid, Timestamp } from '../base';
import type { DocumentBlock } from './document-blocks';

/**
 * Document entity - a mutable container for rich content.
 *
 * Key characteristics:
 * - Mutable: content can be edited freely
 * - Block-based: content is an ordered array of blocks
 * - Supports embeds: can reference Nodes and LoomTrees
 * - Linkable: can be connected to other entities via Links
 */
export interface Document {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to parent Grove */
  readonly groveId: Ulid;

  /** Display name */
  readonly title: string;

  /** Auto-generated 1-2 sentence summary, null until generated */
  readonly summary: string | null;

  /** Ordered array of content blocks */
  readonly blocks: readonly DocumentBlock[];

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;

  /** Soft delete timestamp, null if active */
  readonly archivedAt: Timestamp | null;
}

/**
 * Input for creating a new Document
 */
export interface CreateDocumentInput {
  /** ULID for the new document (pre-generated) */
  id: Ulid;

  /** Parent Grove reference */
  groveId: Ulid;

  /** Display name */
  title: string;

  /** Initial blocks (can be empty) */
  blocks?: DocumentBlock[];
}

/**
 * Input for updating a Document
 */
export interface UpdateDocumentInput {
  /** New title */
  title?: string;

  /** New blocks (replaces entire array) */
  blocks?: DocumentBlock[];
}

/**
 * Filters for querying documents
 */
export interface DocumentFilters {
  /** Filter by archive status */
  archived?: boolean;

  /** Full-text search on title + text block content */
  search?: string;
}
