/**
 * Edge Entity
 *
 * A directed hyperedge connecting source Node(s) to a target Node.
 * Edges represent relationships between nodes in the Loom Tree.
 */

import type { Ulid, Timestamp, EdgeType } from '../base';
import type { EdgeSource } from './edge-source';

/**
 * Edge entity - represents a relationship between nodes.
 *
 * Key characteristics:
 * - Directed: flows from source(s) to target
 * - Hyperedge: can have multiple sources (for complex generation or versioning)
 * - Typed: continuation (traversal) or annotation (comments)
 */
export interface Edge {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to parent LoomTree */
  readonly loomTreeId: Ulid;

  /**
   * Source nodes for this edge.
   * Most edges have a single primary source.
   * Multiple sources support:
   * - Complex generation (image + text prompt)
   * - Buffer Mode versioning (original + edited versions)
   */
  readonly sources: readonly EdgeSource[];

  /** Reference to the target Node */
  readonly targetNodeId: Ulid;

  /**
   * Type of relationship:
   * - continuation: target continues from source(s), used for traversal
   * - annotation: target is a comment on source, excluded from context
   */
  readonly edgeType: EdgeType;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a new Edge
 */
export interface CreateEdgeInput {
  /** ULID for the new edge (pre-generated) */
  id: Ulid;

  /** Parent LoomTree reference */
  loomTreeId: Ulid;

  /** Source nodes with roles */
  sources: EdgeSource[];

  /** Target node reference */
  targetNodeId: Ulid;

  /** Edge type */
  edgeType: EdgeType;

  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * Filters for querying edges
 */
export interface EdgeFilters {
  /** Filter by edge type */
  edgeType?: EdgeType;
}
