import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  IAgentRepository,
  CreateAgentInput,
  UpdateAgentInput,
} from '@application/repositories';
import type {
  Agent as AgentEntity,
  AgentConfiguration,
  AgentPermissions,
  AgentType,
} from '@domain/entities';
import {
  createULID,
  parseModelRef,
  type ModelRef,
  type ULID,
} from '@domain/value-objects';

import AgentModel from '../model/Agent';
import {
  isPlainObject,
  isRecordNotFoundError,
  toOptionalDate,
} from './helpers';

const DEFAULT_AGENT_CONFIGURATION: AgentConfiguration = {};

const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  loomAware: false,
  loomWrite: true,
  loomGenerate: true,
  docRead: true,
  docWrite: true,
};

/** WatermelonDB implementation of `IAgentRepository`. */
export class WatermelonAgentRepository implements IAgentRepository {
  private readonly db: Database;
  private readonly agents: Collection<AgentModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.agents = this.db.get<AgentModel>('agents');
    this.now = now;
  }

  async findById(id: ULID): Promise<AgentEntity | null> {
    try {
      const model = await this.agents.find(id);
      return this.toDomain(model);
    } catch (error) {
      if (isRecordNotFoundError(error, this.agents.table)) {
        return null;
      }
      throw error;
    }
  }

  async create(input: CreateAgentInput): Promise<AgentEntity> {
    this.validateModelRefForType(input.type, input.modelRef);

    const id = createULID();
    const createdAt = this.now();
    const configuration =
      input.configuration ?? DEFAULT_AGENT_CONFIGURATION;
    const permissions = this.normalizePermissions(input.permissions);

    return this.db.write(async () => {
      const model = await this.agents.create((record) => {
        record._raw.id = id;
        record.name = input.name;
        record.agentType = input.type;
        record.modelRef = input.modelRef ?? null;
        record.configuration = configuration as Record<string, unknown>;
        record.permissions = permissions;
        record.loomAware = permissions.loomAware;
        record.createdAt = createdAt;
        record.updatedAt = createdAt;
        record.archivedAt = null;
      });

      return this.toDomain(model);
    });
  }

  async update(input: UpdateAgentInput): Promise<AgentEntity> {
    return this.db.write(async () => {
      const model = await this.agents.find(input.id);

      await model.update((record) => {
        if (input.changes.name !== undefined) {
          record.name = input.changes.name;
        }

        if (input.changes.modelRef !== undefined) {
          if (record.agentType === 'human') {
            throw new Error('Human agents cannot have modelRef');
          }
          record.modelRef = input.changes.modelRef;
        }

        if (input.changes.configuration !== undefined) {
          record.configuration =
            input.changes.configuration as Record<string, unknown>;
        }

        if (input.changes.permissions !== undefined) {
          const permissions = this.normalizePermissions(
            input.changes.permissions
          );
          record.permissions = permissions;
          record.loomAware = permissions.loomAware;
        }

        record.updatedAt = this.now();
      });

      return this.toDomain(model);
    });
  }

  async archive(id: ULID): Promise<AgentEntity> {
    return this.db.write(async () => {
      const model = await this.agents.find(id);
      await model.update((record) => {
        const now = this.now();
        record.archivedAt = now;
        record.updatedAt = now;
      });
      return this.toDomain(model);
    });
  }

  async restore(id: ULID): Promise<AgentEntity> {
    return this.db.write(async () => {
      const model = await this.agents.find(id);
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
        const model = await this.agents.find(id);
        await model.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.agents.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  async findAll(
    onlyActive: boolean = true,
    type?: AgentType
  ): Promise<AgentEntity[]> {
    const queryClauses = [];

    if (onlyActive) {
      queryClauses.push(Q.where('archived_at', null));
    }

    if (type) {
      queryClauses.push(Q.where('agent_type', type));
    }

    const models = await this.agents.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findHumans(onlyActive: boolean = true): Promise<AgentEntity[]> {
    return this.findAll(onlyActive, 'human');
  }

  async findModels(onlyActive: boolean = true): Promise<AgentEntity[]> {
    return this.findAll(onlyActive, 'model');
  }

  async findByModelRef(
    modelRef: ModelRef,
    onlyActive: boolean = true
  ): Promise<AgentEntity[]> {
    const queryClauses = [Q.where('model_ref', modelRef)];
    if (onlyActive) {
      queryClauses.push(Q.where('archived_at', null));
    }

    const models = await this.agents.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  async findLoomAware(onlyActive: boolean = true): Promise<AgentEntity[]> {
    const queryClauses = [Q.where('loom_aware', true)];
    if (onlyActive) {
      queryClauses.push(Q.where('archived_at', null));
    }

    const models = await this.agents.query(...queryClauses).fetch();
    return models.map((model) => this.toDomain(model));
  }

  private validateModelRefForType(
    type: AgentType,
    modelRef: ModelRef | undefined
  ): void {
    if (type === 'human' && modelRef !== undefined) {
      throw new Error('Human agents cannot have modelRef');
    }

    if (type === 'model' && modelRef === undefined) {
      throw new Error('Model agents must include modelRef');
    }
  }

  private normalizePermissions(
    permissions: Partial<AgentPermissions> | undefined
  ): AgentPermissions {
    return {
      loomAware: permissions?.loomAware ?? DEFAULT_AGENT_PERMISSIONS.loomAware,
      loomWrite: permissions?.loomWrite ?? DEFAULT_AGENT_PERMISSIONS.loomWrite,
      loomGenerate:
        permissions?.loomGenerate ?? DEFAULT_AGENT_PERMISSIONS.loomGenerate,
      docRead: permissions?.docRead ?? DEFAULT_AGENT_PERMISSIONS.docRead,
      docWrite: permissions?.docWrite ?? DEFAULT_AGENT_PERMISSIONS.docWrite,
    };
  }

  private toDomain(model: AgentModel): AgentEntity {
    const permissions = this.readPermissions(model.permissions, model.loomAware);

    return {
      id: model.id as ULID,
      name: model.name,
      type: model.agentType as AgentType,
      modelRef: model.modelRef ? parseModelRef(model.modelRef) : undefined,
      configuration: this.readConfiguration(model.configuration),
      permissions,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      archivedAt: toOptionalDate(model.archivedAt),
    };
  }

  private readConfiguration(raw: unknown): AgentConfiguration {
    if (!isPlainObject(raw)) {
      return DEFAULT_AGENT_CONFIGURATION;
    }

    const stopSequencesRaw = raw.stopSequences;
    const stopSequences = Array.isArray(stopSequencesRaw)
      ? stopSequencesRaw.filter(
          (sequence): sequence is string => typeof sequence === 'string'
        )
      : undefined;

    return {
      systemPrompt:
        typeof raw.systemPrompt === 'string' ? raw.systemPrompt : undefined,
      temperature:
        typeof raw.temperature === 'number' ? raw.temperature : undefined,
      maxTokens: typeof raw.maxTokens === 'number' ? raw.maxTokens : undefined,
      stopSequences,
      customParameters: isPlainObject(raw.customParameters)
        ? raw.customParameters
        : undefined,
    };
  }

  private readPermissions(
    raw: unknown,
    loomAwareColumn: boolean | null
  ): AgentPermissions {
    const permissions = this.normalizePermissions(
      isPlainObject(raw)
        ? {
            loomAware:
              typeof raw.loomAware === 'boolean' ? raw.loomAware : undefined,
            loomWrite:
              typeof raw.loomWrite === 'boolean' ? raw.loomWrite : undefined,
            loomGenerate:
              typeof raw.loomGenerate === 'boolean'
                ? raw.loomGenerate
                : undefined,
            docRead: typeof raw.docRead === 'boolean' ? raw.docRead : undefined,
            docWrite:
              typeof raw.docWrite === 'boolean' ? raw.docWrite : undefined,
          }
        : undefined
    );

    if (typeof loomAwareColumn === 'boolean') {
      return {
        ...permissions,
        loomAware: loomAwareColumn,
      };
    }

    return permissions;
  }
}
