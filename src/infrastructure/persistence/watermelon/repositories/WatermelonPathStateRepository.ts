import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  IPathStateRepository,
  CreatePathStateInput,
  PathState,
  PathMode,
} from '@application/repositories/core/IPathRepository';
import { createULID, type ULID } from '@domain/value-objects';

import { PathState as PathStateModel } from '../model/Path';

/** WatermelonDB implementation of `IPathStateRepository`. */
export class WatermelonPathStateRepository implements IPathStateRepository {
  private readonly db: Database;
  private readonly pathStates: Collection<PathStateModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.pathStates = this.db.get<PathStateModel>('path_states');
    this.now = now;
  }

  async findByPathId(
    pathId: ULID,
    agentId: ULID,
    mode?: PathMode
  ): Promise<PathState | null> {
    const states = await this.pathStates
      .query(
        Q.where('path_id', pathId),
        Q.where('agent_id', agentId),
        Q.where('mode', mode ?? null)
      )
      .fetch();

    if (states.length === 0) {
      return null;
    }

    return this.toDomain(states[0]);
  }

  async create(input: CreatePathStateInput): Promise<PathState> {
    const created = await this.db.write(async () => {
      const state = await this.pathStates.create((record) => {
        record._raw.id = createULID();
        record.pathId = input.pathId;
        record.agentId = input.agentId;
        record.mode = input.mode ?? null;
        record.activeNodeId = input.activeNodeId;
        record.updatedAt = this.now();
      });

      return state;
    });

    return this.toDomain(created);
  }

  async setActiveNode(
    pathId: ULID,
    agentId: ULID,
    activeNodeId: ULID,
    mode?: PathMode
  ): Promise<PathState> {
    return this.db.write(async () => {
      const existing = await this.pathStates
        .query(
          Q.where('path_id', pathId),
          Q.where('agent_id', agentId),
          Q.where('mode', mode ?? null)
        )
        .fetch();

      if (existing.length > 0) {
        const state = existing[0];
        await state.update((record) => {
          record.activeNodeId = activeNodeId;
          record.updatedAt = this.now();
        });
        return this.toDomain(state);
      }

      const state = await this.pathStates.create((record) => {
        record._raw.id = createULID();
        record.pathId = pathId;
        record.agentId = agentId;
        record.mode = mode ?? null;
        record.activeNodeId = activeNodeId;
        record.updatedAt = this.now();
      });

      return this.toDomain(state);
    });
  }

  async hardDeleteByPathId(pathId: ULID): Promise<boolean> {
    return this.db.write(async () => {
      const states = await this.pathStates
        .query(Q.where('path_id', pathId))
        .fetch();

      if (states.length === 0) {
        return false;
      }

      for (const state of states) {
        await state.destroyPermanently();
      }

      return true;
    });
  }

  private toDomain(model: PathStateModel): PathState {
    return {
      id: model.id as ULID,
      pathId: model.pathId as ULID,
      agentId: model.agentId as ULID,
      mode: model.mode ? (model.mode as PathMode) : undefined,
      activeNodeId: model.activeNodeId as ULID,
      updatedAt: model.updatedAt,
    };
  }
}
