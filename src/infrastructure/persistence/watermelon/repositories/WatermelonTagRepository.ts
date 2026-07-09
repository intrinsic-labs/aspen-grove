import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  CreateTagInput,
  ITagRepository,
  UpdateTagInput,
} from '@application/repositories';
import type {
  Tag as TagEntity,
  TagAssignment as TagAssignmentEntity,
  TaggableType,
} from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import {
  Tag as TagModel,
  TagAssignment as TagAssignmentModel,
} from '../model/Tag';
import { isRecordNotFoundError, toOptionalString } from './helpers';

/** WatermelonDB implementation of `ITagRepository`. */
export class WatermelonTagRepository implements ITagRepository {
  private readonly db: Database;
  private readonly tags: Collection<TagModel>;
  private readonly assignments: Collection<TagAssignmentModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.tags = this.db.get<TagModel>('tags');
    this.assignments = this.db.get<TagAssignmentModel>('tag_assignments');
    this.now = now;
  }

  // === Tag CRUD ===

  async findTagById(id: ULID): Promise<TagEntity | null> {
    try {
      return this.toTag(await this.tags.find(id));
    } catch (error) {
      if (isRecordNotFoundError(error, this.tags.table)) {
        return null;
      }
      throw error;
    }
  }

  async findTagByName(groveId: ULID, name: string): Promise<TagEntity | null> {
    const models = await this.tags
      .query(Q.where('grove_id', groveId), Q.where('name', name))
      .fetch();
    return models.length > 0 ? this.toTag(models[0]) : null;
  }

  async createTag(input: CreateTagInput): Promise<TagEntity> {
    const existing = await this.findTagByName(input.groveId, input.name);
    if (existing) {
      throw new Error(`Tag "${input.name}" already exists in this grove.`);
    }

    const id = createULID();
    const createdAt = this.now();
    return this.db.write(async () => {
      const model = await this.tags.create((record) => {
        record._raw.id = id;
        record.groveId = input.groveId;
        record.name = input.name;
        record.color = input.color ?? null;
        record.createdAt = createdAt;
      });
      return this.toTag(model);
    });
  }

  async updateTag(input: UpdateTagInput): Promise<TagEntity> {
    return this.db.write(async () => {
      const model = await this.tags.find(input.id);
      await model.update((record) => {
        if (input.changes.name !== undefined) {
          record.name = input.changes.name;
        }
        if (input.changes.color !== undefined) {
          record.color = input.changes.color;
        }
      });
      return this.toTag(model);
    });
  }

  async deleteTag(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const model = await this.tags.find(id);
        const assignmentModels = await this.assignments
          .query(Q.where('tag_id', id))
          .fetch();
        for (const assignment of assignmentModels) {
          await assignment.destroyPermanently();
        }
        await model.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.tags.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  // === Tag Queries ===

  async findTagsByGroveId(groveId: ULID): Promise<TagEntity[]> {
    const models = await this.tags
      .query(Q.where('grove_id', groveId), Q.sortBy('name', Q.asc))
      .fetch();
    return models.map((model) => this.toTag(model));
  }

  async findTagsForItem(
    targetType: TaggableType,
    targetId: ULID
  ): Promise<TagEntity[]> {
    const assignments = await this.findAssignmentsByItem(targetType, targetId);
    const tags: TagEntity[] = [];
    for (const assignment of assignments) {
      const tag = await this.findTagById(assignment.tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    return tags;
  }

  // === Assignment Operations ===

  async assignTag(
    tagId: ULID,
    targetType: TaggableType,
    targetId: ULID
  ): Promise<TagAssignmentEntity> {
    const existing = await this.findAssignment(tagId, targetType, targetId);
    if (existing) {
      return existing;
    }

    const id = createULID();
    const createdAt = this.now();
    return this.db.write(async () => {
      const model = await this.assignments.create((record) => {
        record._raw.id = id;
        record.tagId = tagId;
        record.targetType = targetType;
        record.targetId = targetId;
        record.createdAt = createdAt;
      });
      return this.toAssignment(model);
    });
  }

  async unassignTag(
    tagId: ULID,
    targetType: TaggableType,
    targetId: ULID
  ): Promise<boolean> {
    const models = await this.assignments
      .query(
        Q.where('tag_id', tagId),
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();
    if (models.length === 0) {
      return false;
    }
    await this.db.write(async () => {
      for (const model of models) {
        await model.destroyPermanently();
      }
    });
    return true;
  }

  async findAssignmentsByTagId(tagId: ULID): Promise<TagAssignmentEntity[]> {
    const models = await this.assignments
      .query(Q.where('tag_id', tagId))
      .fetch();
    return models.map((model) => this.toAssignment(model));
  }

  async findAssignmentsByItem(
    targetType: TaggableType,
    targetId: ULID
  ): Promise<TagAssignmentEntity[]> {
    const models = await this.assignments
      .query(
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();
    return models.map((model) => this.toAssignment(model));
  }

  // === Bulk Operations ===

  async findItemsByTag(
    tagId: ULID,
    targetType?: TaggableType
  ): Promise<TagAssignmentEntity[]> {
    const clauses = [Q.where('tag_id', tagId)];
    if (targetType) {
      clauses.push(Q.where('target_type', targetType));
    }
    const models = await this.assignments.query(...clauses).fetch();
    return models.map((model) => this.toAssignment(model));
  }

  async assignTags(
    tagIds: readonly ULID[],
    targetType: TaggableType,
    targetId: ULID
  ): Promise<TagAssignmentEntity[]> {
    const results: TagAssignmentEntity[] = [];
    for (const tagId of tagIds) {
      results.push(await this.assignTag(tagId, targetType, targetId));
    }
    return results;
  }

  async clearTagsFromItem(
    targetType: TaggableType,
    targetId: ULID
  ): Promise<boolean> {
    const models = await this.assignments
      .query(
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();
    if (models.length === 0) {
      return false;
    }
    await this.db.write(async () => {
      for (const model of models) {
        await model.destroyPermanently();
      }
    });
    return true;
  }

  // === Helpers ===

  private async findAssignment(
    tagId: ULID,
    targetType: TaggableType,
    targetId: ULID
  ): Promise<TagAssignmentEntity | null> {
    const models = await this.assignments
      .query(
        Q.where('tag_id', tagId),
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();
    return models.length > 0 ? this.toAssignment(models[0]) : null;
  }

  private toTag(model: TagModel): TagEntity {
    return {
      id: model.id as ULID,
      groveId: model.groveId as ULID,
      name: model.name,
      color: toOptionalString(model.color),
      createdAt: model.createdAt,
    };
  }

  private toAssignment(model: TagAssignmentModel): TagAssignmentEntity {
    return {
      id: model.id as ULID,
      tagId: model.tagId as ULID,
      targetType: model.targetType as TaggableType,
      targetId: model.targetId as ULID,
      createdAt: model.createdAt,
    };
  }
}
