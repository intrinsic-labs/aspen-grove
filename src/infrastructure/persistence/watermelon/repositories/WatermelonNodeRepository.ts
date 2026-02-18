import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  INodeRepository,
  CreateNodeInput,
  NodeMetadataChanges,
} from '@application/repositories';
import type {
  AgentType,
  Content,
  Node as NodeEntity,
  NodeMetadata,
} from '@domain/entities';
import {
  createULID,
  type ContentHash,
  type LocalId,
  type ULID,
} from '@domain/value-objects';

import NodeModel from '../model/Node';
import { isPlainObject, isRecordNotFoundError, toOptionalString } from './helpers';

/** WatermelonDB implementation of `INodeRepository`. */
export class WatermelonNodeRepository implements INodeRepository {
  private readonly db: Database;
  private readonly nodes: Collection<NodeModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.nodes = this.db.get<NodeModel>('nodes');
    this.now = now;
  }

  async findById(id: ULID, includePruned: boolean = false): Promise<NodeEntity | null> {
    try {
      const model = await this.nodes.find(id);
      if (!includePruned && model.pruned === true) {
        return null;
      }
      return this.toDomain(model);
    } catch (error) {
      if (isRecordNotFoundError(error, this.nodes.table)) {
        return null;
      }
      throw error;
    }
  }

  async findByLocalId(
    loomTreeId: ULID,
    localId: LocalId,
    includePruned: boolean = false
  ): Promise<NodeEntity | null> {
    const queryClauses = [
      Q.where('loom_tree_id', loomTreeId),
      Q.where('local_id', localId),
    ];
    if (!includePruned) {
      queryClauses.push(Q.where('pruned', Q.notEq(true)));
    }

    const models = await this.nodes.query(...queryClauses).fetch();
    if (models.length === 0) {
      return null;
    }
    return this.toDomain(models[0]);
  }

  async findByLoomTreeId(
    loomTreeId: ULID,
    includePruned: boolean = false,
    agentType?: AgentType
  ): Promise<NodeEntity[]> {
    const queryClauses = [Q.where('loom_tree_id', loomTreeId)];
    if (!includePruned) {
      queryClauses.push(Q.where('pruned', Q.notEq(true)));
    }
    if (agentType) {
      queryClauses.push(Q.where('author_type', agentType));
    }

    const models = await this.nodes.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findBookmarked(loomTreeId: ULID): Promise<NodeEntity[]> {
    const models = await this.nodes
      .query(
        Q.where('loom_tree_id', loomTreeId),
        Q.where('bookmarked', true),
        Q.where('pruned', Q.notEq(true))
      )
      .fetch();

    return models.map((model) => this.toDomain(model));
  }

  async findPruned(loomTreeId: ULID, agentType?: AgentType): Promise<NodeEntity[]> {
    const queryClauses = [
      Q.where('loom_tree_id', loomTreeId),
      Q.where('pruned', true),
    ];
    if (agentType) {
      queryClauses.push(Q.where('author_type', agentType));
    }

    const models = await this.nodes.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findByAuthorAgentId(
    authorAgentId: ULID,
    loomTreeId?: ULID,
    includePruned: boolean = false
  ): Promise<NodeEntity[]> {
    const queryClauses = [Q.where('author_agent_id', authorAgentId)];
    if (loomTreeId) {
      queryClauses.push(Q.where('loom_tree_id', loomTreeId));
    }
    if (!includePruned) {
      queryClauses.push(Q.where('pruned', Q.notEq(true)));
    }

    const models = await this.nodes.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findByEditedFrom(editedFromId: ULID): Promise<NodeEntity[]> {
    const models = await this.nodes
      .query(Q.where('edited_from', editedFromId))
      .fetch();

    return models.map((model) => this.toDomain(model));
  }

  async getAllLocalIds(loomTreeId: ULID): Promise<Set<LocalId>> {
    const models = await this.nodes.query(Q.where('loom_tree_id', loomTreeId)).fetch();
    return new Set(models.map((model) => model.localId as LocalId));
  }

  async create(input: CreateNodeInput): Promise<NodeEntity> {
    const id = input.id ?? createULID();
    const createdAt = input.createdAt ?? this.now();
    const metadata = this.defaultMetadata();

    return this.db.write(async () => {
      const versionGroupId = await this.resolveVersionGroupId(id, input.editedFrom);

      const model = await this.nodes.create((record) => {
        record._raw.id = id;
        record.localId = input.localId;
        record.loomTreeId = input.loomTreeId;
        record.content = input.content;
        record.summary = null;
        record.authorAgentId = input.authorAgentId;
        record.authorType = input.authorType;
        record.contentHash = input.contentHash;
        record.createdAt = createdAt;
        record.metadata = this.serializeMetadata(metadata);
        record.bookmarked = metadata.bookmarked;
        record.bookmarkLabel = metadata.bookmarkLabel ?? null;
        record.pruned = metadata.pruned;
        record.excluded = metadata.excluded;
        record.versionGroupId = versionGroupId;
        record.editedFrom = input.editedFrom ?? null;
      });

      return this.toDomain(model);
    });
  }

  async updateMetadata(
    nodeId: ULID,
    changes: NodeMetadataChanges
  ): Promise<NodeEntity> {
    return this.db.write(async () => {
      const model = await this.nodes.find(nodeId);
      const current = this.readMetadata(model);

      const nextBookmarked = changes.bookmarked ?? current.bookmarked;
      const nextBookmarkLabel =
        changes.bookmarkLabel !== undefined
          ? changes.bookmarkLabel ?? undefined
          : current.bookmarkLabel;

      const next: NodeMetadata = {
        bookmarked: nextBookmarked,
        bookmarkLabel: nextBookmarked ? nextBookmarkLabel : undefined,
        pruned: changes.pruned ?? current.pruned,
        excluded: changes.excluded ?? current.excluded,
      };

      await model.update((record) => {
        record.metadata = this.serializeMetadata(next);
        record.bookmarked = next.bookmarked;
        record.bookmarkLabel = next.bookmarkLabel ?? null;
        record.pruned = next.pruned;
        record.excluded = next.excluded;
      });

      return this.toDomain(model);
    });
  }

  async updateSummary(nodeId: ULID, summary: string): Promise<NodeEntity> {
    return this.db.write(async () => {
      const model = await this.nodes.find(nodeId);
      await model.update((record) => {
        record.summary = summary;
      });
      return this.toDomain(model);
    });
  }

  async hardDelete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const model = await this.nodes.find(id);
        await model.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.nodes.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  private defaultMetadata(): NodeMetadata {
    return {
      bookmarked: false,
      bookmarkLabel: undefined,
      pruned: false,
      excluded: false,
    };
  }

  private async resolveVersionGroupId(
    nodeId: ULID,
    editedFrom?: ULID
  ): Promise<ULID> {
    if (!editedFrom) {
      return nodeId;
    }

    const source = await this.nodes.find(editedFrom);
    return (source.versionGroupId as ULID | null) ?? (source.id as ULID);
  }

  private readMetadata(model: NodeModel): NodeMetadata {
    const raw = isPlainObject(model.metadata) ? model.metadata : {};

    const bookmarked =
      typeof model.bookmarked === 'boolean'
        ? model.bookmarked
        : typeof raw.bookmarked === 'boolean'
          ? raw.bookmarked
          : false;

    const pruned =
      typeof model.pruned === 'boolean'
        ? model.pruned
        : typeof raw.pruned === 'boolean'
          ? raw.pruned
          : false;

    const excluded =
      typeof model.excluded === 'boolean'
        ? model.excluded
        : typeof raw.excluded === 'boolean'
          ? raw.excluded
          : false;

    const bookmarkLabel =
      typeof model.bookmarkLabel === 'string'
        ? model.bookmarkLabel
        : typeof raw.bookmarkLabel === 'string'
          ? raw.bookmarkLabel
          : undefined;

    return {
      bookmarked,
      bookmarkLabel: bookmarked ? bookmarkLabel : undefined,
      pruned,
      excluded,
    };
  }

  private serializeMetadata(metadata: NodeMetadata): Record<string, unknown> {
    return {
      bookmarked: metadata.bookmarked,
      bookmarkLabel: metadata.bookmarkLabel,
      pruned: metadata.pruned,
      excluded: metadata.excluded,
    };
  }

  private toDomain(model: NodeModel): NodeEntity {
    return {
      id: model.id as ULID,
      localId: model.localId as LocalId,
      loomTreeId: model.loomTreeId as ULID,
      content: model.content as Content,
      summary: toOptionalString(model.summary),
      authorAgentId: model.authorAgentId as ULID,
      authorType: model.authorType as AgentType,
      contentHash: model.contentHash as ContentHash,
      createdAt: model.createdAt,
      metadata: this.readMetadata(model),
      editedFrom: model.editedFrom ? (model.editedFrom as ULID) : undefined,
    };
  }
}
