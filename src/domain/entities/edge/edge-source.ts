/**
 * Edge Source
 *
 * Represents a source node in a hyperedge.
 * Edges can have multiple sources to support complex relationships
 * like version nodes in Buffer Mode.
 */

import type { Ulid } from '../base';
import { EdgeSourceRole } from '../base';

/**
 * A single source in an Edge's sources array.
 * Each source identifies a node and its role in the relationship.
 */
export interface EdgeSource {
  /** Reference to the source Node */
  readonly nodeId: Ulid;

  /**
   * Role of this source in the edge relationship.
   * - primary: Main content source
   * - context: Additional context for generation
   * - instruction: Guidance/instructions for generation
   */
  readonly role: EdgeSourceRole;
}

/**
 * Create an EdgeSource object
 */
export function createEdgeSource(
  nodeId: Ulid,
  role: EdgeSourceRole = EdgeSourceRole.Primary
): EdgeSource {
  return {
    nodeId,
    role,
  };
}

/**
 * Create a primary EdgeSource (most common case)
 */
export function createPrimarySource(nodeId: Ulid): EdgeSource {
  return createEdgeSource(nodeId, EdgeSourceRole.Primary);
}

/**
 * Type guard for EdgeSource
 */
export function isEdgeSource(value: unknown): value is EdgeSource {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const source = value as Record<string, unknown>;

  return (
    typeof source.nodeId === 'string' &&
    typeof source.role === 'string' &&
    Object.values(EdgeSourceRole).includes(source.role as EdgeSourceRole)
  );
}

/**
 * Type guard for an array of EdgeSources
 */
export function isEdgeSourceArray(value: unknown): value is EdgeSource[] {
  return Array.isArray(value) && value.every(isEdgeSource);
}
