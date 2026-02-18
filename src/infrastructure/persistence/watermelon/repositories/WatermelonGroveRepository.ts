import type { Database } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import type {
  IGroveRepository,
  CreateGroveInput,
  UpdateGroveInput,
} from '@application/repositories';
import type { Grove as GroveEntity } from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import GroveModel from '../model/Grove';
import { Q } from '@nozbe/watermelondb';
import { isRecordNotFoundError } from './helpers';

/** WatermelonDB implementation of `IGroveRepository`. */
export class WatermelonGroveRepository implements IGroveRepository {
  private readonly db: Database;
  private readonly groves: Collection<GroveModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.groves = this.db.get<GroveModel>('groves');
    this.now = now;
  }

  async findById(id: ULID): Promise<GroveEntity | null> {
    try {
      const model = await this.groves.find(id);
      return this.toDomain(model);
    } catch (error) {
      return null;
    }
  }

  async findByOwnerAgentId(ownerAgentId: ULID): Promise<GroveEntity | null> {
    try {
      const models = await this.groves
        .query(Q.where('owner_agent_id', ownerAgentId))
        .fetch();
      if (models.length === 0) {
        return null;
      }
      return this.toDomain(models[0]);
    } catch (error) {
      return null;
    }
  }

  async create(input: CreateGroveInput): Promise<GroveEntity> {
    const id = createULID();
    return this.db.write(async () => {
      const model = await this.groves.create((record) => {
        record._raw.id = id;
        record.name = input.name;
        record.ownerAgentId = input.ownerAgentId;
        record.createdAt = this.now();
        record.updatedAt = this.now();
      });
      return this.toDomain(model);
    });
  }

  async update(input: UpdateGroveInput): Promise<GroveEntity> {
    return this.db.write(async () => {
      const model = await this.groves.find(input.id);
      await model.update((record) => {
        if (input.changes.name !== undefined) {
          record.name = input.changes.name;
        }
        record.updatedAt = this.now();
      });
      return this.toDomain(model);
    });
  }

  async hardDelete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const model = await this.groves.find(id);
        await model.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.groves.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  // === Mapping helpers ===

  private toDomain(model: GroveModel): GroveEntity {
    return {
      id: model.id as ULID,
      name: model.name,
      ownerAgentId: model.ownerAgentId as ULID,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
