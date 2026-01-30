/**
 * Node Entity
 *
 * A single unit of content within a Loom Tree.
 * Nodes are immutable once created - edits create new nodes.
 */

import type { Ulid, LocalId, Timestamp, AuthorType } from '../base';
import type { Content } from '../content';
import type { NodeMetadata } from './node-metadata';

/**
 * Node entity - represents a single piece of content in a Loom Tree.
 *
 * Key characteristics:
 * - Immutable: content cannot be changed after creation
 * - Multimodal: can contain text, images, audio, or combinations
 * - Hashable: contentHash provides tamper evidence
 * - Tree-unique localId for efficient loom-aware model interactions
 */
export interface Node {
  /** ULID primary identifier */
  readonly id: Ulid;

  /**
   * Short, tree-unique identifier (6-8 chars).
   * Derived from ULID prefix, used in loom-aware context.
   */
  readonly localId: LocalId;

  /** Reference to parent LoomTree */
  readonly loomTreeId: Ulid;

  /** The node's content (text, image, audio, or mixed) */
  readonly content: Content;

  /** Auto-generated 1-2 sentence summary, null until generated */
  readonly summary: string | null;

  /** Reference to the Agent that created this node */
  readonly authorAgentId: Ulid;

  /**
   * Author type, denormalized from Agent for efficient hash verification.
   * Determines which hash algorithm to use.
   */
  readonly authorType: AuthorType;

  /**
   * SHA-256 hash for tamper evidence.
   * Computed differently for human vs model nodes.
   * @see provenance.md for hash computation algorithm
   */
  readonly contentHash: string;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Node metadata (bookmarks, pruning, exclusion) */
  readonly metadata: NodeMetadata;

  /**
   * Buffer Mode: reference to the Node this was edited from.
   * Null for original nodes, set for version nodes.
   */
  readonly editedFrom: Ulid | null;
}

/**
 * Input for creating a new Node.
 * Some fields are computed during creation (localId, contentHash).
 */
export interface CreateNodeInput {
  /** ULID for the new node (pre-generated) */
  id: Ulid;

  /** Parent LoomTree reference */
  loomTreeId: Ulid;

  /** The node's content */
  content: Content;

  /** Author Agent reference */
  authorAgentId: Ulid;

  /** Author type (human or model) */
  authorType: AuthorType;

  /** Pre-computed content hash */
  contentHash: string;

  /** Creation timestamp */
  createdAt: Timestamp;

  /** Optional parent node IDs for edge creation */
  parentNodeIds?: Ulid[];

  /** For version nodes in Buffer Mode */
  editedFrom?: Ulid;

  /** Initial metadata, defaults applied if not provided */
  metadata?: Partial<NodeMetadata>;
}

/**
 * Filters for querying nodes
 */
export interface NodeFilters {
  /** Filter by author agent */
  authorAgentId?: Ulid;

  /** Filter by author type */
  authorType?: AuthorType;

  /** Filter bookmarked nodes */
  bookmarked?: boolean;

  /** Filter pruned nodes */
  pruned?: boolean;

  /** Filter by content type */
  contentType?: 'text' | 'image' | 'audio' | 'mixed';
}
