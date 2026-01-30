/**
 * Node Repository Interface
 *
 * Abstract contract for Node persistence operations.
 * Nodes are immutable content units within a Loom Tree.
 */

import type {
  Node,
  CreateNodeInput,
  NodeFilters,
  NodeMetadata,
  Ulid,
} from '../../domain';
import type { Pagination, PaginatedResult } from './common';

/**
 * Node repository interface.
 *
 * Handles persistence for Node entities. Nodes are immutable once created -
 * only metadata (bookmarks, pruning, exclusion) can be modified.
 */
export interface INodeRepository {
  /**
   * Create a new Node.
   *
   * Generates localId automatically (6-8 char ULID prefix, extended on collision).
   * Creates Continuation edges from parentNodeIds if provided.
   *
   * @param input - Node creation parameters (contentHash must be pre-computed)
   * @returns The created Node with localId populated
   */
  create(input: CreateNodeInput): Promise<Node>;

  /**
   * Find a Node by ID.
   *
   * @param id - Node ULID
   * @returns The Node or null if not found
   */
  findById(id: Ulid): Promise<Node | null>;

  /**
   * Find a Node by its tree-unique localId.
   *
   * Used for loom-aware model interactions where full ULIDs are too long.
   *
   * @param loomTreeId - Parent LoomTree ULID
   * @param localId - Tree-unique short identifier (6-8 chars)
   * @returns The Node or null if not found
   */
  findByLocalId(loomTreeId: Ulid, localId: string): Promise<Node | null>;

  /**
   * List Nodes in a LoomTree with optional filtering and pagination.
   *
   * @param loomTreeId - Parent LoomTree ULID
   * @param filters - Optional filters
   * @param pagination - Optional pagination parameters
   * @returns Paginated list of Nodes
   */
  findByLoomTree(
    loomTreeId: Ulid,
    filters?: NodeFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Node>>;

  /**
   * Find the root Node of a LoomTree.
   *
   * The root is the node with no incoming Continuation edges.
   *
   * @param loomTreeId - LoomTree ULID
   * @returns The root Node
   * @throws NotFoundError if the tree has no root (should never happen)
   */
  findRoot(loomTreeId: Ulid): Promise<Node>;

  /**
   * Find all direct children of a Node.
   *
   * Children are Nodes connected by outgoing Continuation edges.
   *
   * @param nodeId - Parent Node ULID
   * @returns Array of child Nodes
   */
  findChildren(nodeId: Ulid): Promise<Node[]>;

  /**
   * Find sibling Nodes (nodes sharing the same parent).
   *
   * Excludes the given node from results.
   *
   * @param nodeId - Node ULID
   * @returns Array of sibling Nodes
   */
  findSiblings(nodeId: Ulid): Promise<Node[]>;

  /**
   * Compute the path from root to a given Node.
   *
   * Traverses Continuation edges backward to root.
   *
   * @param nodeId - Target Node ULID
   * @returns Ordered array of Nodes from root to target (inclusive)
   */
  findPath(nodeId: Ulid): Promise<Node[]>;

  /**
   * Update Node metadata.
   *
   * Does not modify content or contentHash - only mutable metadata fields.
   *
   * @param id - Node ULID
   * @param metadata - Metadata fields to update
   * @returns The updated Node
   * @throws NotFoundError if Node doesn't exist
   */
  updateMetadata(id: Ulid, metadata: Partial<NodeMetadata>): Promise<Node>;

  /**
   * Update Node summary.
   *
   * Called after async summary generation completes.
   *
   * @param id - Node ULID
   * @param summary - Generated summary text
   * @returns The updated Node
   * @throws NotFoundError if Node doesn't exist
   */
  updateSummary(id: Ulid, summary: string): Promise<Node>;

  /**
   * Find all Nodes edited from a given Node (version nodes).
   *
   * Used in Buffer Mode to find all versions of a node.
   *
   * @param nodeId - Original Node ULID
   * @returns Array of version Nodes
   */
  findVersions(nodeId: Ulid): Promise<Node[]>;

  /**
   * Get all existing localIds in a LoomTree.
   *
   * Used during Node creation to detect localId collisions.
   *
   * @param loomTreeId - LoomTree ULID
   * @returns Set of existing localIds
   */
  getExistingLocalIds(loomTreeId: Ulid): Promise<Set<string>>;

  /**
   * Count Nodes in a LoomTree.
   *
   * @param loomTreeId - LoomTree ULID
   * @param filters - Optional filters
   * @returns Count of matching Nodes
   */
  count(loomTreeId: Ulid, filters?: NodeFilters): Promise<number>;

  /**
   * Find bookmarked Nodes in a LoomTree.
   *
   * Convenience method for quick bookmark access.
   *
   * @param loomTreeId - LoomTree ULID
   * @returns Array of bookmarked Nodes
   */
  findBookmarked(loomTreeId: Ulid): Promise<Node[]>;

  /**
   * Observe a Node for changes.
   *
   * Returns an observable that emits whenever the Node is updated.
   * Used for reactive UI updates.
   *
   * @param id - Node ULID
   * @returns Observable of Node updates
   */
  observe(id: Ulid): Observable<Node | null>;

  /**
   * Observe Nodes in a LoomTree.
   *
   * Returns an observable that emits whenever any Node in the tree changes.
   *
   * @param loomTreeId - LoomTree ULID
   * @param filters - Optional filters
   * @returns Observable of Node arrays
   */
  observeByLoomTree(
    loomTreeId: Ulid,
    filters?: NodeFilters
  ): Observable<Node[]>;
}

/**
 * Simple observable interface for reactive queries.
 * Compatible with RxJS Observable pattern.
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
