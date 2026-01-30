/**
 * Link Entity
 *
 * A bidirectional reference between any two items.
 * Used for cross-tree and cross-document references.
 *
 * Note: Connections *within* a single Loom Tree use Edges
 * (type 'continuation' or 'annotation'), not Links.
 */

import type { Ulid, Timestamp, LinkableType } from '../base';

/**
 * Link entity - a bidirectional reference between items.
 *
 * Key characteristics:
 * - Bidirectional: queryable from either end
 * - Cross-type: can connect different entity types
 * - Labeled: optional description of the relationship
 */
export interface Link {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to parent Grove */
  readonly groveId: Ulid;

  /** Type of the source item */
  readonly sourceType: LinkableType;

  /** Reference to the source item */
  readonly sourceId: Ulid;

  /** Type of the target item */
  readonly targetType: LinkableType;

  /** Reference to the target item */
  readonly targetId: Ulid;

  /** Optional label describing the relationship */
  readonly label: string | null;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a new Link
 */
export interface CreateLinkInput {
  /** ULID for the new link (pre-generated) */
  id: Ulid;

  /** Parent Grove reference */
  groveId: Ulid;

  /** Source item type */
  sourceType: LinkableType;

  /** Source item reference */
  sourceId: Ulid;

  /** Target item type */
  targetType: LinkableType;

  /** Target item reference */
  targetId: Ulid;

  /** Optional relationship label */
  label?: string;
}

/**
 * Reference to a linked item (returned from queries)
 */
export interface LinkedItemRef {
  /** Item type */
  type: LinkableType;

  /** Item ID */
  id: Ulid;
}

/**
 * Create a LinkedItemRef
 */
export function createLinkedItemRef(type: LinkableType, id: Ulid): LinkedItemRef {
  return { type, id };
}

/**
 * Check if two links reference the same connection
 * (regardless of direction)
 */
export function isSameConnection(a: Link, b: Link): boolean {
  const aForward =
    a.sourceType === b.sourceType &&
    a.sourceId === b.sourceId &&
    a.targetType === b.targetType &&
    a.targetId === b.targetId;

  const aReverse =
    a.sourceType === b.targetType &&
    a.sourceId === b.targetId &&
    a.targetType === b.sourceType &&
    a.targetId === b.sourceId;

  return aForward || aReverse;
}

/**
 * Get the "other" end of a link given one end
 */
export function getOtherEnd(
  link: Link,
  knownType: LinkableType,
  knownId: Ulid
): LinkedItemRef | null {
  if (link.sourceType === knownType && link.sourceId === knownId) {
    return { type: link.targetType, id: link.targetId };
  }

  if (link.targetType === knownType && link.targetId === knownId) {
    return { type: link.sourceType, id: link.sourceId };
  }

  return null;
}
