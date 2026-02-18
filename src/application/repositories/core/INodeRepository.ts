import { AgentType, Content, Node } from '@/domain';
import { ContentHash, LocalId, ULID } from '@domain/value-objects';

export interface INodeRepository {
  // === Basic CRUD ===

  /** Find a Node by ID, or null if not found. */
  findById(id: ULID, includePruned?: boolean): Promise<Node | null>;

  /** Find a Node by its tree-unique localId. */
  findByLocalId(
    loomTreeId: ULID,
    localId: LocalId,
    includePruned?: boolean
  ): Promise<Node | null>;

  /** Find by loomTreeId */
  findByLoomTreeId(
    loomTreeId: ULID,
    includePruned?: boolean,
    agentType?: AgentType
  ): Promise<Node[]>;

  /** Find all bookmarked Nodes in a tree */
  findBookmarked(loomTreeId: ULID): Promise<Node[]>;

  /** Find all pruned Nodes in a tree */
  findPruned(loomTreeId: ULID, agentType?: AgentType): Promise<Node[]>;

  /** Find all nodes authored by a certain Agent */
  findByAuthorAgentId(
    authorAgentId: ULID,
    loomTreeId?: ULID,
    includePruned?: boolean
  ): Promise<Node[]>;

  /** Find by editedFrom id */
  findByEditedFrom(editedFromId: ULID): Promise<Node[]>;

  /** Get all localIds from a tree */
  getAllLocalIds(loomTreeId: ULID): Promise<Set<LocalId>>;

  /** Create a new Node. Returns a Node with `localId` populated, `summary` null */
  create(input: CreateNodeInput): Promise<Node>;

  /** Update a Node's metadata */
  updateMetadata(nodeId: ULID, changes: NodeMetadataChanges): Promise<Node>;

  /** Update the summary for a Node's content */
  updateSummary(nodeId: ULID, summary: string): Promise<Node>;

  /** Permanently delete a Node by ID */
  hardDelete(id: ULID): Promise<boolean>;
}

export type CreateNodeInput = {
  /**
   * Optional caller-supplied id.
   * Provide this when localId must be derived from the exact node ULID.
   */
  readonly id?: ULID;
  /**
   * Optional caller-supplied timestamp used in content-hash computation.
   * When omitted, repository assigns current time.
   */
  readonly createdAt?: Date;
  readonly loomTreeId: ULID;
  /** Use case generates via `createLocalId()` after checking collisions. */
  readonly localId: LocalId;
  readonly content: Content;
  readonly authorAgentId: ULID;
  readonly authorType: AgentType;
  readonly contentHash: ContentHash;
  readonly editedFrom?: ULID;
};

export type NodeMetadataChanges = {
  bookmarked?: boolean;
  bookmarkLabel?: string | null;
  pruned?: boolean;
  excluded?: boolean;
};
