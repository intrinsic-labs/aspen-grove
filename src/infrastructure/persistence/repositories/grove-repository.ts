/**
 * Grove Repository Implementation
 *
 * WatermelonDB implementation of IGroveRepository.
 * Manages persistence for the Grove entity (top-level container for user data).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type { IGroveRepository } from '../../../application/repositories';
import type { Grove, CreateGroveInput, UpdateGroveInput, Ulid } from '../../../domain';
import { NotFoundError } from '../../../domain';
import { GroveModel } from '../models';

/**
 * Convert a GroveModel to a domain Grove entity.
 */
function toDomain(model: GroveModel): Grove {
  return {
    id: model.id as Ulid,
    name: model.name,
    ownerAgentId: model.ownerAgentId as Ulid,
    createdAt: model.createdAt.getTime(),
    updatedAt: model.updatedAt.getTime(),
  };
}

/**
 * WatermelonDB implementation of Grove repository.
 */
export class GroveRepository implements IGroveRepository {
  constructor(private database: Database) {}

  async create(input: CreateGroveInput): Promise<Grove> {
    const grovesCollection = this.database.get<GroveModel>('groves');

    const created = await this.database.write(async () => {
      return grovesCollection.create((grove) => {
        grove._raw.id = input.id;
        grove.name = input.name ?? 'My Grove';
        grove.ownerAgentId = input.ownerAgentId;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Grove | null> {
    try {
      const grovesCollection = this.database.get<GroveModel>('groves');
      const model = await grovesCollection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByOwner(ownerAgentId: Ulid): Promise<Grove | null> {
    const grovesCollection = this.database.get<GroveModel>('groves');
    const results = await grovesCollection
      .query(Q.where('owner_agent_id', ownerAgentId))
      .fetch();

    if (results.length === 0) {
      return null;
    }

    return toDomain(results[0]);
  }

  async update(id: Ulid, changes: UpdateGroveInput): Promise<Grove> {
    const grovesCollection = this.database.get<GroveModel>('groves');

    let model: GroveModel;
    try {
      model = await grovesCollection.find(id);
    } catch {
      throw new NotFoundError('Grove', id);
    }

    await this.database.write(async () => {
      await model.update((grove) => {
        if (changes.name !== undefined) {
          grove.name = changes.name;
        }
      });
    });

    return toDomain(model);
  }

  async exists(id: Ulid): Promise<boolean> {
    const grove = await this.findById(id);
    return grove !== null;
  }

  async getDefault(): Promise<Grove | null> {
    const grovesCollection = this.database.get<GroveModel>('groves');
    const results = await grovesCollection.query().fetch();

    if (results.length === 0) {
      return null;
    }

    return toDomain(results[0]);
  }
}
