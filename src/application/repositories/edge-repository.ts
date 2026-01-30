/**
 * Edge Repository Interface
 *
 * Abstract contract for Edge persistence operations.
 * Edges are directed hyperedges connecting source Node(s) to a target Node.
 */

import type {
  Edge,
  CreateEdgeInput,
  EdgeFilters,
  EdgeSource,
  EdgeSourceRole,
  Ulid,
} from '../../domain';

/**
 * Edge repository interface.
 *
 * Handles persistence for Edge entities. Edges represent relationships
 * between nodes in a Loom Tree - either continuations (for traversal)
 * or annotations (for comments/notes).
 */
export interface IEdgeRepository {
  /**
   * Create a new Edge connecting source Node(s) to a target Node.
   *
   * Validates that all nodes belong to the same LoomTree.
   *
   * @param input - Edge creation parameters
   * @returns The created Edge
   * @throws ValidationError if nodes don't belong to the same tree
   */
  create(input: CreateEdgeInput): Promise<Edge>;

  /**
   * Find an Edge by ID.
   *
   * @param id - Edge ULID
   * @returns The Edge or null if not found
   */
  findById(id: Ulid): Promise<Edge | null>;

  /**
   * Find all Edges pointing to a Node (incoming edges).
   *
   * Used for path computation - traversing backward to root.
   *
   * @param targetNodeId - Target Node ULID
   * @returns Array of incoming Edges
   */
  findByTarget(targetNodeId: Ulid): Promise<Edge[]>;

  /**
   * Find all Edges originating from a Node (outgoing edges).
   *
   * Used for finding children - traversing forward from a node.
   *
   * @param sourceNodeId - Source Node ULID
   * @returns Array of outgoing Edges
   */
  findBySource(sourceNodeId: Ulid): Promise<Edge[]>;

  /**
   * List all Edges in a LoomTree with optional filtering.
   *
   * @param loomTreeId - LoomTree ULID
   * @param filters - Optional filters (e.g., by edge type)
   * @returns Array of Edges
   */
  findByLoomTree(loomTreeId: Ulid, filters?: EdgeFilters): Promise<Edge[]>;

  /**
   * Delete an Edge.
   *
   * @param id - Edge ULID
   * @returns true if deletion succeeded
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Add a version node as an alternate source to an edge.
   *
   * Used in Buffer Mode when a node is edited, creating a version node.
   * All downstream edges gain the version as an alternate source,
   * allowing path context to determine which version to use.
   *
   * @param edgeId - Edge ULID
   * @param versionNodeId - The new version node to add as source
   * @param role - Role for the new source (typically matches existing)
   * @returns The updated Edge
   * @throws NotFoundError if Edge doesn't exist
   * @throws ValidationError if version node doesn't belong to same tree
   */
  addVersionSource(
    edgeId: Ulid,
    versionNodeId: Ulid,
    role: EdgeSourceRole
  ): Promise<Edge>;

  /**
   * Find continuation edges from a node (outgoing continuation edges).
   *
   * Convenience method that filters findBySource to continuation edges only.
   *
   * @param sourceNodeId - Source Node ULID
   * @returns Array of continuation Edges
   */
  findContinuations(sourceNodeId: Ulid): Promise<Edge[]>;

  /**
   * Find annotation edges to a node (incoming annotation edges).
   *
   * @param targetNodeId - Target Node ULID
   * @returns Array of annotation Edges
   */
  findAnnotations(targetNodeId: Ulid): Promise<Edge[]>;

  /**
   * Check if a node has any outgoing continuation edges.
   *
   * Used to determine if a node is a leaf.
   *
   * @param nodeId - Node ULID
   * @returns true if node has children
   */
  hasChildren(nodeId: Ulid): Promise<boolean>;

  /**
   * Check if a node has any incoming continuation edges.
   *
   * A node with no incoming continuation edges is the root.
   *
   * @param nodeId - Node ULID
   * @returns true if node has a parent
   */
  hasParent(nodeId: Ulid): Promise<boolean>;

  /**
   * Get the primary parent edge for a node.
   *
   * Returns the first incoming continuation edge (most nodes have exactly one).
   * Returns null for root nodes.
   *
   * @param nodeId - Node ULID
   * @returns The parent Edge or null if root
   */
  findParentEdge(nodeId: Ulid): Promise<Edge | null>;

  /**
   * Count edges in a LoomTree.
   *
   * @param loomTreeId - LoomTree ULID
   * @param filters - Optional filters
   * @returns Count of matching Edges
   */
  count(loomTreeId: Ulid, filters?: EdgeFilters): Promise<number>;

  /**
   * Delete all edges in a LoomTree.
   *
   * Used when deleting a LoomTree (cascade delete).
   *
   * @param loomTreeId - LoomTree ULID
   * @returns Number of deleted edges
   */
  deleteByLoomTree(loomTreeId: Ulid): Promise<number>;

  /**
   * Observe edges for a node (both incoming and outgoing).
   *
   * Returns an observable that emits whenever edges connected
   * to this node change.
   *
   * @param nodeId - Node ULID
   * @returns Observable of Edge arrays
   */
  observeByNode(nodeId: Ulid): Observable<Edge[]>;
}

/**
 * Simple observable interface for reactive queries.
 */
export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}
