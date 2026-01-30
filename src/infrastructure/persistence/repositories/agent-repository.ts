/**
 * Agent Repository Implementation
 *
 * WatermelonDB implementation of IAgentRepository.
 * Manages persistence for Agent entities (humans and models).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  IAgentRepository,
  Pagination,
  PaginatedResult,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentFilters,
  AuthorType,
  Ulid,
} from '../../../domain';
import {
  NotFoundError,
  DEFAULT_AGENT_CONFIGURATION,
  DEFAULT_AGENT_PERMISSIONS,
  AuthorType as AuthorTypeEnum,
} from '../../../domain';
import { AgentModel } from '../models';

/**
 * Convert an AgentModel to a domain Agent entity.
 */
function toDomain(model: AgentModel): Agent {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of Agent repository.
 */
export class AgentRepository implements IAgentRepository {
  constructor(private database: Database) {}

  async create(input: CreateAgentInput): Promise<Agent> {
    const agentsCollection = this.database.get<AgentModel>('agents');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return agentsCollection.create((agent) => {
        agent._raw.id = input.id;
        agent.name = input.name;
        agent.type = input.type;
        agent.modelRef = input.modelRef;
        agent.configuration = {
          ...DEFAULT_AGENT_CONFIGURATION,
          ...input.configuration,
        };
        agent.permissions = {
          ...DEFAULT_AGENT_PERMISSIONS,
          ...input.permissions,
        };
        agent.loomAware = input.loomAware ?? input.type === AuthorTypeEnum.Human;
        agent.createdAt = now;
        agent.updatedAt = now;
        agent.archivedAt = null;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Agent | null> {
    try {
      const agentsCollection = this.database.get<AgentModel>('agents');
      const model = await agentsCollection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByType(
    type: AuthorType,
    filters?: AgentFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Agent>> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    const conditions = [Q.where('type', type)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    if (filters?.loomAware !== undefined) {
      conditions.push(Q.where('loom_aware', filters.loomAware));
    }

    const query = agentsCollection.query(...conditions);
    const total = await query.fetchCount();

    let results: AgentModel[];
    if (pagination) {
      results = await query.extend(Q.skip(pagination.offset), Q.take(pagination.limit)).fetch();
    } else {
      results = await query.fetch();
    }

    return {
      items: results.map(toDomain),
      total,
      hasMore: pagination ? pagination.offset + results.length < total : false,
    };
  }

  async findByModelRef(modelRef: string): Promise<Agent[]> {
    const agentsCollection = this.database.get<AgentModel>('agents');
    const results = await agentsCollection.query(Q.where('model_ref', modelRef)).fetch();

    return results.map(toDomain);
  }

  async update(id: Ulid, changes: UpdateAgentInput): Promise<Agent> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    let model: AgentModel;
    try {
      model = await agentsCollection.find(id);
    } catch {
      throw new NotFoundError('Agent', id);
    }

    await this.database.write(async () => {
      await model.update((agent) => {
        if (changes.name !== undefined) {
          agent.name = changes.name;
        }
        if (changes.configuration !== undefined) {
          agent.configuration = { ...agent.configuration, ...changes.configuration };
        }
        if (changes.permissions !== undefined) {
          agent.permissions = { ...agent.permissions, ...changes.permissions };
        }
        if (changes.loomAware !== undefined) {
          agent.loomAware = changes.loomAware;
        }
        agent.updatedAt = Date.now();
      });
    });

    return toDomain(model);
  }

  async archive(id: Ulid): Promise<boolean> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    let model: AgentModel;
    try {
      model = await agentsCollection.find(id);
    } catch {
      throw new NotFoundError('Agent', id);
    }

    await model.archive();
    return true;
  }

  async restore(id: Ulid): Promise<boolean> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    let model: AgentModel;
    try {
      model = await agentsCollection.find(id);
    } catch {
      throw new NotFoundError('Agent', id);
    }

    await model.restore();
    return true;
  }

  async findOwner(): Promise<Agent> {
    const agentsCollection = this.database.get<AgentModel>('agents');
    const results = await agentsCollection
      .query(Q.where('type', AuthorTypeEnum.Human), Q.where('archived_at', null))
      .fetch();

    if (results.length === 0) {
      throw new NotFoundError('Agent', 'owner');
    }

    return toDomain(results[0]);
  }

  async findActive(filters?: AgentFilters): Promise<Agent[]> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    const conditions = [Q.where('archived_at', null)];

    if (filters?.type !== undefined) {
      conditions.push(Q.where('type', filters.type));
    }
    if (filters?.loomAware !== undefined) {
      conditions.push(Q.where('loom_aware', filters.loomAware));
    }

    const results = await agentsCollection.query(...conditions).fetch();
    return results.map(toDomain);
  }

  async exists(id: Ulid): Promise<boolean> {
    const agent = await this.findById(id);
    return agent !== null;
  }

  async count(type?: AuthorType, filters?: AgentFilters): Promise<number> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    const conditions: Q.Clause[] = [];

    if (type !== undefined) {
      conditions.push(Q.where('type', type));
    }
    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }
    if (filters?.loomAware !== undefined) {
      conditions.push(Q.where('loom_aware', filters.loomAware));
    }

    return agentsCollection.query(...conditions).fetchCount();
  }

  observe(id: Ulid): Observable<Agent | null> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    return {
      subscribe: (observerOrNext: Observer<Agent | null> | ((value: Agent | null) => void)) => {
        const observer: Observer<Agent | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = agentsCollection.findAndObserve(id).subscribe({
          next: (model) => observer.next(toDomain(model)),
          error: () => observer.next(null),
        });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }

  observeModelAgents(): Observable<Agent[]> {
    const agentsCollection = this.database.get<AgentModel>('agents');

    return {
      subscribe: (observerOrNext: Observer<Agent[]> | ((value: Agent[]) => void)) => {
        const observer: Observer<Agent[]> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = agentsCollection
          .query(Q.where('type', AuthorTypeEnum.Model), Q.where('archived_at', null))
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
