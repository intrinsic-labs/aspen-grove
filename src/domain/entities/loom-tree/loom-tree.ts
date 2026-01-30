/**
 * LoomTree Entity
 *
 * The top-level container for a branching exploration.
 * A Loom Tree is a hypergraph-backed tree that represents
 * branching conversations or collaborative text.
 */

import type { Ulid, Timestamp, LoomTreeMode } from '../base';

/**
 * LoomTree entity - the atomic unit of LLM interaction in Aspen Grove.
 *
 * Key characteristics:
 * - Contains a tree of Nodes connected by Edges
 * - Has exactly one root Node
 * - Mode (dialogue/buffer) is immutable after creation
 * - Supports system context for persistent instructions
 */
export interface LoomTree {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to parent Grove */
  readonly groveId: Ulid;

  /** User-editable display name */
  readonly title: string;

  /** Optional user-editable description */
  readonly description: string | null;

  /** Auto-generated 1-2 sentence summary, null until generated */
  readonly summary: string | null;

  /** Reference to the single root Node */
  readonly rootNodeId: Ulid;

  /**
   * Interaction mode - determines rendering and behavior.
   * Immutable after creation.
   */
  readonly mode: LoomTreeMode;

  /** Optional persistent instructions prepended to every context window */
  readonly systemContext: string | null;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;

  /** Soft delete timestamp, null if active */
  readonly archivedAt: Timestamp | null;
}

/**
 * Input for creating a new LoomTree
 */
export interface CreateLoomTreeInput {
  /** ULID for the new tree (pre-generated) */
  id: Ulid;

  /** Parent Grove reference */
  groveId: Ulid;

  /** Interaction mode */
  mode: LoomTreeMode;

  /** Optional display name (auto-generated if not provided) */
  title?: string;

  /** Optional description */
  description?: string;

  /** Optional system context */
  systemContext?: string;

  /** Optional initial content for root Node */
  initialContent?: {
    content: unknown; // Content type, kept loose here to avoid circular dep
    authorAgentId: Ulid;
  };
}

/**
 * Filters for querying LoomTrees
 */
export interface LoomTreeFilters {
  /** Filter by archive status */
  archived?: boolean;

  /** Filter by mode */
  mode?: LoomTreeMode;

  /** Search in title/description */
  search?: string;
}

/**
 * Update input for LoomTree metadata
 */
export interface UpdateLoomTreeInput {
  /** New title */
  title?: string;

  /** New description */
  description?: string;

  /** New system context */
  systemContext?: string;
}
