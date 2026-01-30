/**
 * Node Metadata
 *
 * Mutable state flags for a Node that don't affect content hash.
 * These can be changed without creating a new Node.
 */

/**
 * NodeMetadata contains mutable flags that control node behavior
 * without affecting the content hash or provenance chain.
 */
export interface NodeMetadata {
  /** Whether this node is bookmarked for quick access */
  readonly bookmarked: boolean;

  /** Optional label for the bookmark */
  readonly bookmarkLabel: string | null;

  /** Whether this node (and its descendants) are pruned from view */
  readonly pruned: boolean;

  /** Whether this node is excluded from context window */
  readonly excluded: boolean;
}

/**
 * Default metadata values for new nodes
 */
export const DEFAULT_NODE_METADATA: NodeMetadata = {
  bookmarked: false,
  bookmarkLabel: null,
  pruned: false,
  excluded: false,
};

/**
 * Create a NodeMetadata object with defaults for unspecified fields
 */
export function createNodeMetadata(
  partial: Partial<NodeMetadata> = {}
): NodeMetadata {
  return {
    ...DEFAULT_NODE_METADATA,
    ...partial,
  };
}

/**
 * Type guard for NodeMetadata
 */
export function isNodeMetadata(value: unknown): value is NodeMetadata {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const meta = value as Record<string, unknown>;

  return (
    typeof meta.bookmarked === 'boolean' &&
    (meta.bookmarkLabel === null || typeof meta.bookmarkLabel === 'string') &&
    typeof meta.pruned === 'boolean' &&
    typeof meta.excluded === 'boolean'
  );
}
