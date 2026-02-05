// ## Edge

import { ULID } from '../value-objects';
import { EdgeType, SourceRole } from './enums';

/**
 * Edge type
 *
 * A directed hyperedge connecting source Node(s) to a target Node.
 */
export interface Edge {
  readonly id: ULID;
  readonly loomTreeId: ULID;
  readonly sources: EdgeSource[];
  readonly targetNodeId: ULID;
  readonly edgeType: EdgeType;
  readonly createdAt: Date;
}

/**
 * EdgeSource type
 */
export interface EdgeSource {
  readonly nodeId: ULID;
  readonly role: SourceRole;
}
