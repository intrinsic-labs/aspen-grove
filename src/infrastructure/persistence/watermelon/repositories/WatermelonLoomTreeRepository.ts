import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  ILoomTreeRepository,
  CreateLoomTreeInput,
  UpdateLoomTreeInput,
} from '@application/repositories';
import type {
  LoomTree as LoomTreeEntity,
  LoomTreeMode,
} from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import LoomTreeModel from '../model/LoomTree';
import NodeModel from '../model/Node';
import { Edge as EdgeModel, EdgeSource as EdgeSourceModel } from '../model/Edge';
import {
  Path as PathModel,
  PathNode as PathNodeModel,
  PathSelection as PathSelectionModel,
  PathState as PathStateModel,
} from '../model/Path';
import {
  isRecordNotFoundError,
  toOptionalDate,
  toOptionalString,
} from './helpers';

/** WatermelonDB implementation of `ILoomTreeRepository`. */
export class WatermelonLoomTreeRepository implements ILoomTreeRepository {
  private readonly db: Database;
  private readonly loomTrees: Collection<LoomTreeModel>;
  private readonly nodes: Collection<NodeModel>;
  private readonly edges: Collection<EdgeModel>;
  private readonly edgeSources: Collection<EdgeSourceModel>;
  private readonly paths: Collection<PathModel>;
  private readonly pathNodes: Collection<PathNodeModel>;
  private readonly pathSelections: Collection<PathSelectionModel>;
  private readonly pathStates: Collection<PathStateModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.loomTrees = this.db.get<LoomTreeModel>('loom_trees');
    this.nodes = this.db.get<NodeModel>('nodes');
    this.edges = this.db.get<EdgeModel>('edges');
    this.edgeSources = this.db.get<EdgeSourceModel>('edge_sources');
    this.paths = this.db.get<PathModel>('paths');
    this.pathNodes = this.db.get<PathNodeModel>('path_nodes');
    this.pathSelections = this.db.get<PathSelectionModel>('path_selections');
    this.pathStates = this.db.get<PathStateModel>('path_states');
    this.now = now;
  }

  async findById(id: ULID): Promise<LoomTreeEntity | null> {
    try {
      const model = await this.loomTrees.find(id);
      return this.toDomain(model);
    } catch (error) {
      if (isRecordNotFoundError(error, this.loomTrees.table)) {
        return null;
      }
      throw error;
    }
  }

  async create(input: CreateLoomTreeInput): Promise<LoomTreeEntity> {
    const id = createULID();
    const createdAt = this.now();

    return this.db.write(async () => {
      const model = await this.loomTrees.create((record) => {
        record._raw.id = id;
        record.groveId = input.groveId;
        record.title = input.title ?? this.defaultTitle(createdAt);
        record.description = input.description ?? null;
        record.summary = null;
        record.rootNodeId = input.rootNodeId;
        record.mode = input.mode;
        record.systemContext = input.systemContext ?? null;
        record.createdAt = createdAt;
        record.updatedAt = createdAt;
        record.archivedAt = null;
      });

      return this.toDomain(model);
    });
  }

  async update(input: UpdateLoomTreeInput): Promise<LoomTreeEntity> {
    return this.db.write(async () => {
      const model = await this.loomTrees.find(input.id);

      await model.update((record) => {
        if (input.changes.title !== undefined) {
          record.title = input.changes.title;
        }
        if (input.changes.description !== undefined) {
          record.description = input.changes.description;
        }
        if (input.changes.systemContext !== undefined) {
          record.systemContext = input.changes.systemContext;
        }
        record.updatedAt = this.now();
      });

      return this.toDomain(model);
    });
  }

  async archive(id: ULID): Promise<LoomTreeEntity> {
    return this.db.write(async () => {
      const model = await this.loomTrees.find(id);
      await model.update((record) => {
        const now = this.now();
        record.archivedAt = now;
        record.updatedAt = now;
      });
      return this.toDomain(model);
    });
  }

  async restore(id: ULID): Promise<LoomTreeEntity> {
    return this.db.write(async () => {
      const model = await this.loomTrees.find(id);
      await model.update((record) => {
        record.archivedAt = null;
        record.updatedAt = this.now();
      });
      return this.toDomain(model);
    });
  }

  async hardDelete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const tree = await this.loomTrees.find(id);

        await this.deleteTreePaths(id);
        await this.deleteTreeEdges(id);
        await this.deleteTreeNodes(id);
        await tree.destroyPermanently();

        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.loomTrees.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  async findByGroveId(
    groveId: ULID,
    onlyActive: boolean = true,
    limit?: number,
    offset?: number
  ): Promise<LoomTreeEntity[]> {
    const baseClauses = [Q.where('grove_id', groveId)];
    if (onlyActive) {
      baseClauses.push(Q.where('archived_at', null));
    }

    let query = this.loomTrees.query(...baseClauses);
    if (offset !== undefined) {
      query = query.extend(Q.skip(offset));
    }
    if (limit !== undefined) {
      query = query.extend(Q.take(limit));
    }

    const models = await query.fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findByMode(
    groveId: ULID,
    mode: LoomTreeMode,
    onlyActive: boolean = true,
    limit?: number,
    offset?: number
  ): Promise<LoomTreeEntity[]> {
    const baseClauses = [Q.where('grove_id', groveId), Q.where('mode', mode)];
    if (onlyActive) {
      baseClauses.push(Q.where('archived_at', null));
    }

    let query = this.loomTrees.query(...baseClauses);
    if (offset !== undefined) {
      query = query.extend(Q.skip(offset));
    }
    if (limit !== undefined) {
      query = query.extend(Q.take(limit));
    }

    const models = await query.fetch();
    return models.map((model) => this.toDomain(model));
  }

  private defaultTitle(createdAt: Date): string {
    return `Loom Tree ${createdAt.toISOString()}`;
  }

  private async deleteTreeNodes(loomTreeId: ULID): Promise<void> {
    const nodes = await this.nodes.query(Q.where('loom_tree_id', loomTreeId)).fetch();
    for (const node of nodes) {
      await node.destroyPermanently();
    }
  }

  private async deleteTreeEdges(loomTreeId: ULID): Promise<void> {
    const edges = await this.edges.query(Q.where('loom_tree_id', loomTreeId)).fetch();
    if (edges.length === 0) {
      return;
    }

    const edgeIds = edges.map((edge) => edge.id);
    const edgeSources = await this.edgeSources
      .query(Q.where('edge_id', Q.oneOf(edgeIds)))
      .fetch();

    for (const edgeSource of edgeSources) {
      await edgeSource.destroyPermanently();
    }

    for (const edge of edges) {
      await edge.destroyPermanently();
    }
  }

  private async deleteTreePaths(loomTreeId: ULID): Promise<void> {
    const paths = await this.paths.query(Q.where('loom_tree_id', loomTreeId)).fetch();
    if (paths.length === 0) {
      return;
    }

    const pathIds = paths.map((path) => path.id);
    const [pathNodes, pathSelections, pathStates] = await Promise.all([
      this.pathNodes.query(Q.where('path_id', Q.oneOf(pathIds))).fetch(),
      this.pathSelections.query(Q.where('path_id', Q.oneOf(pathIds))).fetch(),
      this.pathStates.query(Q.where('path_id', Q.oneOf(pathIds))).fetch(),
    ]);

    for (const pathNode of pathNodes) {
      await pathNode.destroyPermanently();
    }
    for (const pathSelection of pathSelections) {
      await pathSelection.destroyPermanently();
    }
    for (const pathState of pathStates) {
      await pathState.destroyPermanently();
    }
    for (const path of paths) {
      await path.destroyPermanently();
    }
  }

  private toDomain(model: LoomTreeModel): LoomTreeEntity {
    return {
      id: model.id as ULID,
      groveId: model.groveId as ULID,
      title: model.title,
      description: toOptionalString(model.description),
      summary: toOptionalString(model.summary),
      rootNodeId: model.rootNodeId as ULID,
      mode: model.mode as LoomTreeMode,
      systemContext: toOptionalString(model.systemContext),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      archivedAt: toOptionalDate(model.archivedAt),
    };
  }
}
