import { ContentHash, ULID } from '../value-objects';
import { LocalId } from '../value-objects/local-id';
import { Content } from './content';
import { AuthorType } from './enums';

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
  readonly authorType: AuthorType;
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
