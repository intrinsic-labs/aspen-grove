import { ULID } from '../value-objects';

/**
 * LinkTargetType
 *
 * The type of item that can be linked.
 */
export type LinkTargetType = 'node' | 'loomTree' | 'document';

/**
 * Link entity
 *
 * A bidirectional reference between any two items (Nodes, LoomTrees, Documents).
 * Used for cross-tree and cross-document references to build the knowledge graph.
 *
 * Note: Connections *within* a single LoomTree use Edges, not Links.
 */
export interface Link {
  readonly id: ULID;
  readonly groveId: ULID;
  readonly sourceType: LinkTargetType;
  readonly sourceId: ULID;
  readonly targetType: LinkTargetType;
  readonly targetId: ULID;
  /** Optional label describing the relationship */
  readonly label?: string;
  readonly createdAt: Date;
}
