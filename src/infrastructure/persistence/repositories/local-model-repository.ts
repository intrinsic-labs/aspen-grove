/**
 * LocalModel Repository Implementation (Stub)
 *
 * WatermelonDB implementation of ILocalModelRepository.
 * Manages persistence for user-defined local models.
 *
 * NOTE: This is a stub implementation for Phase 1.
 * Full implementation planned for Phase 2 (LLM Provider Layer).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  ILocalModelRepository,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  LocalModel,
  CreateLocalModelInput,
  UpdateLocalModelInput,
  LocalModelFilters,
  LocalModelProvider,
  Ulid,
} from '../../../domain';
import { NotImplementedError, NotFoundError, createModelCapabilities } from '../../../domain';
import { deleteLocalModelCredential } from '../../secure-storage';
import { LocalModelModel, AgentModel } from '../models';

/**
 * Convert a LocalModelModel to a domain LocalModel entity.
 */
function toDomain(model: LocalModelModel): LocalModel {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of LocalModel repository.
 *
 * @remarks Stub implementation - most methods throw NotImplementedError
 */
export class LocalModelRepository implements ILocalModelRepository {
  constructor(private database: Database) {}

  async create(input: CreateLocalModelInput): Promise<LocalModel> {
    const collection = this.database.get<LocalModelModel>('local_models');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((model) => {
        model._raw.id = input.id;
        model.identifier = input.identifier;
        model.provider = input.provider;
        model.endpoint = input.endpoint;
        model.authConfig = input.authConfig ?? null;
        model.capabilities = createModelCapabilities(input.capabilities);
        model.createdAt = now;
        model.updatedAt = now;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<LocalModel | null> {
    try {
      const collection = this.database.get<LocalModelModel>('local_models');
      const model = await collection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByIdentifier(identifier: string): Promise<LocalModel | null> {
    const collection = this.database.get<LocalModelModel>('local_models');
    const results = await collection.query(Q.where('identifier', identifier)).fetch();

    if (results.length === 0) {
      return null;
    }

    return toDomain(results[0]);
  }

  async findAll(filters?: LocalModelFilters): Promise<LocalModel[]> {
    const collection = this.database.get<LocalModelModel>('local_models');

    const conditions: Q.Clause[] = [];

    if (filters?.provider) {
      conditions.push(Q.where('provider', filters.provider));
    }

    const results = await collection.query(...conditions).fetch();
    return results.map(toDomain);
  }

  async findByProvider(provider: LocalModelProvider): Promise<LocalModel[]> {
    const collection = this.database.get<LocalModelModel>('local_models');
    const results = await collection.query(Q.where('provider', provider)).fetch();

    return results.map(toDomain);
  }

  async update(id: Ulid, changes: UpdateLocalModelInput): Promise<LocalModel> {
    const collection = this.database.get<LocalModelModel>('local_models');

    let model: LocalModelModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('LocalModel', id);
    }

    await this.database.write(async () => {
      await model.update((record) => {
        if (changes.identifier !== undefined) {
          record.identifier = changes.identifier;
        }
        if (changes.endpoint !== undefined) {
          record.endpoint = changes.endpoint;
        }
        if (changes.authConfig !== undefined) {
          record.authConfig = changes.authConfig;
        }
        if (changes.capabilities !== undefined) {
          record.capabilities = createModelCapabilities(changes.capabilities);
        }
        record.updatedAt = Date.now();
      });
    });

    return toDomain(model);
  }

  async delete(id: Ulid): Promise<boolean> {
    const collection = this.database.get<LocalModelModel>('local_models');

    let model: LocalModelModel;
    try {
      model = await collection.find(id);
    } catch {
      return false;
    }

    // Clean up credential from secure storage if it exists
    if (model.authConfig?.credentialRef) {
      try {
        await deleteLocalModelCredential(id);
      } catch (error) {
        // Log but don't fail the delete if credential cleanup fails
        console.warn('[LocalModelRepository] Failed to cleanup credential for', id, error);
      }
    }

    await this.database.write(async () => {
      await model.destroyPermanently();
    });

    return true;
  }

  async exists(id: Ulid): Promise<boolean> {
    const model = await this.findById(id);
    return model !== null;
  }

  async count(filters?: LocalModelFilters): Promise<number> {
    const collection = this.database.get<LocalModelModel>('local_models');

    const conditions: Q.Clause[] = [];

    if (filters?.provider) {
      conditions.push(Q.where('provider', filters.provider));
    }

    return collection.query(...conditions).fetchCount();
  }

  async hasAgentReferences(id: Ulid): Promise<boolean> {
    const agentsCollection = this.database.get<AgentModel>('agents');
    const modelRef = `local:${id}`;
    const results = await agentsCollection.query(Q.where('model_ref', modelRef)).fetch();

    return results.length > 0;
  }

  observe(id: Ulid): Observable<LocalModel | null> {
    const collection = this.database.get<LocalModelModel>('local_models');

    return {
      subscribe: (
        observerOrNext: Observer<LocalModel | null> | ((value: LocalModel | null) => void)
      ) => {
        const observer: Observer<LocalModel | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = collection.findAndObserve(id).subscribe({
          next: (model) => observer.next(toDomain(model)),
          error: () => observer.next(null),
        });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }

  observeAll(filters?: LocalModelFilters): Observable<LocalModel[]> {
    const collection = this.database.get<LocalModelModel>('local_models');

    const conditions: Q.Clause[] = [];

    if (filters?.provider) {
      conditions.push(Q.where('provider', filters.provider));
    }

    return {
      subscribe: (observerOrNext: Observer<LocalModel[]> | ((value: LocalModel[]) => void)) => {
        const observer: Observer<LocalModel[]> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = collection
          .query(...conditions)
          .observe()
          .subscribe({
            next: (models) => observer.next(models.map(toDomain)),
            error: (err) => observer.error?.(err),
          });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }
}
