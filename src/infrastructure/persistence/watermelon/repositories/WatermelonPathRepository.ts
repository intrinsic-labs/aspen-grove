import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  IPathRepository,
  CreatePathInput,
  UpdatePathInput,
  UpsertPathSelectionInput,
  Path,
  PathNode,
  PathSelection,
} from '@application/repositories';
import { createULID, type ULID } from '@domain/value-objects';

import {
  Path as PathModel,
  PathNode as PathNodeModel,
  PathSelection as PathSelectionModel,
  PathState as PathStateModel,
} from '../model/Path';
import { isRecordNotFoundError, toOptionalDate, toOptionalString } from './helpers';

/** WatermelonDB implementation of `IPathRepository`. */
export class WatermelonPathRepository implements IPathRepository {
  private readonly db: Database;
  private readonly paths: Collection<PathModel>;
  private readonly pathNodes: Collection<PathNodeModel>;
  private readonly pathSelections: Collection<PathSelectionModel>;
  private readonly pathStates: Collection<PathStateModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.paths = this.db.get<PathModel>('paths');
    this.pathNodes = this.db.get<PathNodeModel>('path_nodes');
    this.pathSelections = this.db.get<PathSelectionModel>('path_selections');
    this.pathStates = this.db.get<PathStateModel>('path_states');
    this.now = now;
  }

  async findById(id: ULID): Promise<Path | null> {
    try {
      const path = await this.paths.find(id);
      return this.toDomain(path);
    } catch (error) {
      if (isRecordNotFoundError(error, this.paths.table)) {
        return null;
      }
      throw error;
    }
  }

  async findByTreeAndOwner(
    loomTreeId: ULID,
    ownerAgentId: ULID
  ): Promise<Path | null> {
    const active = await this.paths
      .query(
        Q.where('loom_tree_id', loomTreeId),
        Q.where('owner_agent_id', ownerAgentId),
        Q.where('archived_at', null)
      )
      .fetch();

    if (active.length > 0) {
      return this.toDomain(active[0]);
    }

    const all = await this.paths
      .query(
        Q.where('loom_tree_id', loomTreeId),
        Q.where('owner_agent_id', ownerAgentId)
      )
      .fetch();

    if (all.length === 0) {
      return null;
    }

    return this.toDomain(all[0]);
  }

  async create(input: CreatePathInput): Promise<Path> {
    const id = createULID();
    const createdAt = this.now();

    return this.db.write(async () => {
      const model = await this.paths.create((record) => {
        record._raw.id = id;
        record.loomTreeId = input.loomTreeId;
        record.ownerAgentId = input.ownerAgentId;
        record.name = input.name ?? null;
        record.createdAt = createdAt;
        record.updatedAt = createdAt;
        record.archivedAt = null;
      });

      return this.toDomain(model);
    });
  }

  async update(input: UpdatePathInput): Promise<Path> {
    return this.db.write(async () => {
      const path = await this.paths.find(input.id);

      await path.update((record) => {
        if (input.changes.name !== undefined) {
          record.name = input.changes.name ?? null;
        }
        if (input.changes.archivedAt !== undefined) {
          record.archivedAt = input.changes.archivedAt ?? null;
        }
        record.updatedAt = this.now();
      });

      return this.toDomain(path);
    });
  }

  async hardDelete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const path = await this.paths.find(id);
        await this.deletePathDependents(id);
        await path.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.paths.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  async getNodeSequence(pathId: ULID): Promise<PathNode[]> {
    const rows = await this.pathNodes
      .query(Q.where('path_id', pathId), Q.sortBy('position', Q.asc))
      .fetch();

    return rows.map((row) => this.toPathNodeDomain(row));
  }

  async appendNode(pathId: ULID, nodeId: ULID): Promise<PathNode> {
    return this.db.write(async () => {
      const lastRows = await this.pathNodes
        .query(
          Q.where('path_id', pathId),
          Q.sortBy('position', Q.desc),
          Q.take(1)
        )
        .fetch();

      const nextPosition =
        lastRows.length === 0 ? 0 : lastRows[0].position + 1;

      const row = await this.pathNodes.create((record) => {
        record._raw.id = createULID();
        record.pathId = pathId;
        record.position = nextPosition;
        record.nodeId = nodeId;
        record.createdAt = this.now();
      });

      await this.touchPath(pathId);
      return this.toPathNodeDomain(row);
    });
  }

  async truncate(pathId: ULID, newLength: number): Promise<void> {
    if (newLength < 0) {
      throw new Error('newLength must be >= 0');
    }

    await this.db.write(async () => {
      const rows = await this.pathNodes
        .query(Q.where('path_id', pathId), Q.where('position', Q.gte(newLength)))
        .fetch();

      for (const row of rows) {
        await row.destroyPermanently();
      }

      await this.touchPath(pathId);
    });
  }

  async replaceSuffix(
    pathId: ULID,
    startPosition: number,
    nodeIds: readonly ULID[]
  ): Promise<void> {
    if (startPosition < 0) {
      throw new Error('startPosition must be >= 0');
    }

    await this.db.write(async () => {
      const suffixRows = await this.pathNodes
        .query(
          Q.where('path_id', pathId),
          Q.where('position', Q.gte(startPosition))
        )
        .fetch();

      for (const row of suffixRows) {
        await row.destroyPermanently();
      }

      for (let index = 0; index < nodeIds.length; index++) {
        await this.pathNodes.create((record) => {
          record._raw.id = createULID();
          record.pathId = pathId;
          record.position = startPosition + index;
          record.nodeId = nodeIds[index];
          record.createdAt = this.now();
        });
      }

      await this.touchPath(pathId);
    });
  }

  async getSelections(pathId: ULID): Promise<PathSelection[]> {
    const selections = await this.pathSelections
      .query(Q.where('path_id', pathId))
      .fetch();

    return selections.map((selection) => this.toPathSelectionDomain(selection));
  }

  async getSelection(
    pathId: ULID,
    targetNodeId: ULID
  ): Promise<PathSelection | null> {
    const selections = await this.pathSelections
      .query(Q.where('path_id', pathId), Q.where('target_node_id', targetNodeId))
      .fetch();

    if (selections.length === 0) {
      return null;
    }

    return this.toPathSelectionDomain(selections[0]);
  }

  async upsertSelection(input: UpsertPathSelectionInput): Promise<PathSelection> {
    return this.db.write(async () => {
      const existing = await this.pathSelections
        .query(
          Q.where('path_id', input.pathId),
          Q.where('target_node_id', input.targetNodeId)
        )
        .fetch();

      if (existing.length > 0) {
        const selection = existing[0];
        await selection.update((record) => {
          record.selectedEdgeId = input.selectedEdgeId ?? null;
          record.selectedSourceNodeId = input.selectedSourceNodeId ?? null;
          record.updatedAt = this.now();
        });
        return this.toPathSelectionDomain(selection);
      }

      const selection = await this.pathSelections.create((record) => {
        record._raw.id = createULID();
        record.pathId = input.pathId;
        record.targetNodeId = input.targetNodeId;
        record.selectedEdgeId = input.selectedEdgeId ?? null;
        record.selectedSourceNodeId = input.selectedSourceNodeId ?? null;
        record.updatedAt = this.now();
      });

      return this.toPathSelectionDomain(selection);
    });
  }

  async deleteSelection(pathId: ULID, targetNodeId: ULID): Promise<boolean> {
    return this.db.write(async () => {
      const selections = await this.pathSelections
        .query(Q.where('path_id', pathId), Q.where('target_node_id', targetNodeId))
        .fetch();

      if (selections.length === 0) {
        return false;
      }

      for (const selection of selections) {
        await selection.destroyPermanently();
      }

      return true;
    });
  }

  private async touchPath(pathId: ULID): Promise<void> {
    const path = await this.paths.find(pathId);
    await path.update((record) => {
      record.updatedAt = this.now();
    });
  }

  private async deletePathDependents(pathId: ULID): Promise<void> {
    const [pathNodes, selections, states] = await Promise.all([
      this.pathNodes.query(Q.where('path_id', pathId)).fetch(),
      this.pathSelections.query(Q.where('path_id', pathId)).fetch(),
      this.pathStates.query(Q.where('path_id', pathId)).fetch(),
    ]);

    for (const pathNode of pathNodes) {
      await pathNode.destroyPermanently();
    }
    for (const selection of selections) {
      await selection.destroyPermanently();
    }
    for (const state of states) {
      await state.destroyPermanently();
    }
  }

  private toDomain(model: PathModel): Path {
    return {
      id: model.id as ULID,
      loomTreeId: model.loomTreeId as ULID,
      ownerAgentId: model.ownerAgentId as ULID,
      name: toOptionalString(model.name),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      archivedAt: toOptionalDate(model.archivedAt),
    };
  }

  private toPathNodeDomain(model: PathNodeModel): PathNode {
    return {
      id: model.id as ULID,
      pathId: model.pathId as ULID,
      position: model.position,
      nodeId: model.nodeId as ULID,
      createdAt: model.createdAt,
    };
  }

  private toPathSelectionDomain(model: PathSelectionModel): PathSelection {
    return {
      id: model.id as ULID,
      pathId: model.pathId as ULID,
      targetNodeId: model.targetNodeId as ULID,
      selectedEdgeId: model.selectedEdgeId
        ? (model.selectedEdgeId as ULID)
        : undefined,
      selectedSourceNodeId: model.selectedSourceNodeId
        ? (model.selectedSourceNodeId as ULID)
        : undefined,
      updatedAt: model.updatedAt,
    };
  }
}
