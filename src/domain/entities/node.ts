import { ContentHash, ULID, LocalId } from '../value-objects';
import { Content } from './content';
import { AgentType } from './enums';

/**
 * Node: a single unit of content within a LoomTree.
 */
export interface Node {
  readonly id: ULID;
  readonly localId: LocalId;
  readonly loomTreeId: ULID;
  readonly content: Content;
  readonly summary?: string;
  readonly authorAgentId: ULID;
  readonly authorType: AgentType;
  readonly contentHash: ContentHash;
  readonly createdAt: Date;
  readonly metadata: NodeMetadata;
  readonly editedFrom?: ULID;
}

/**
 * Node Metadata
 */
export interface NodeMetadata {
  readonly bookmarked: boolean;
  readonly bookmarkLabel?: string;
  readonly pruned: boolean;
  readonly excluded: boolean;
}
