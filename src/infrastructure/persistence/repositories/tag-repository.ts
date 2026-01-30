/**
 * Tag Repository Implementation (Stub)
 *
 * WatermelonDB implementation of ITagRepository.
 * Manages persistence for Tag and TagAssignment entities.
 *
 * NOTE: This is a stub implementation for Phase 1.
 * Full implementation planned for Phase 5 (Tree Operations).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type { ITagRepository } from '../../../application/repositories';
import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagAssignment,
  TaggedItemRef,
  LinkableType,
  Ulid,
} from '../../../domain';
import { NotFoundError, ConflictError, NotImplementedError } from '../../../domain';
import { TagModel, TagAssignmentModel } from '../models';

/**
 * Convert a TagModel to a domain Tag entity.
 */
function tagToDomain(model: TagModel): Tag {
  return model.toDomain();
}

/**
 * Convert a TagAssignmentModel to a domain TagAssignment entity.
 */
function assignmentToDomain(model: TagAssignmentModel): TagAssignment {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of Tag repository.
 *
 * @remarks Stub implementation - some methods throw NotImplementedError
 */
export class TagRepository implements ITagRepository {
  constructor(private database: Database) {}

  // ============================================
  // Tag Operations
  // ============================================

  async createTag(input: CreateTagInput): Promise<Tag> {
    // Check for existing tag with same name in grove
    const existing = await this.findTagByName(input.groveId, input.name);
    if (existing) {
      throw new ConflictError(`Tag "${input.name}" already exists in this Grove`, existing.id);
    }

    const collection = this.database.get<TagModel>('tags');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((tag) => {
        tag._raw.id = input.id;
        tag.groveId = input.groveId;
        tag.name = input.name;
        tag.color = input.color ?? null;
        // Set readonly field via _raw
        (tag._raw as Record<string, unknown>).created_at = now;
      });
    });

    return tagToDomain(created);
  }

  async findTagById(id: Ulid): Promise<Tag | null> {
    try {
      const collection = this.database.get<TagModel>('tags');
      const model = await collection.find(id);
      return tagToDomain(model);
    } catch {
      return null;
    }
  }

  async findTagByName(groveId: Ulid, name: string): Promise<Tag | null> {
    const collection = this.database.get<TagModel>('tags');
    const results = await collection
      .query(Q.where('grove_id', groveId), Q.where('name', name))
      .fetch();

    if (results.length === 0) {
      return null;
    }

    return tagToDomain(results[0]);
  }

  async findTagsByGrove(groveId: Ulid): Promise<Tag[]> {
    const collection = this.database.get<TagModel>('tags');
    const results = await collection.query(Q.where('grove_id', groveId)).fetch();

    return results.map(tagToDomain);
  }

  async updateTag(id: Ulid, changes: UpdateTagInput): Promise<Tag> {
    const collection = this.database.get<TagModel>('tags');

    let model: TagModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('Tag', id);
    }

    // Check for name conflict if changing name
    if (changes.name !== undefined && changes.name !== model.name) {
      const existing = await this.findTagByName(model.groveId, changes.name);
      if (existing) {
        throw new ConflictError(`Tag "${changes.name}" already exists in this Grove`, existing.id);
      }
    }

    await this.database.write(async () => {
      await model.update((tag) => {
        if (changes.name !== undefined) {
          tag.name = changes.name;
        }
        if (changes.color !== undefined) {
          tag.color = changes.color;
        }
      });
    });

    return tagToDomain(model);
  }

  async deleteTag(id: Ulid): Promise<boolean> {
    const tagCollection = this.database.get<TagModel>('tags');
    const assignmentCollection = this.database.get<TagAssignmentModel>('tag_assignments');

    let model: TagModel;
    try {
      model = await tagCollection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      // Delete all assignments for this tag
      const assignments = await assignmentCollection.query(Q.where('tag_id', id)).fetch();

      for (const assignment of assignments) {
        await assignment.destroyPermanently();
      }

      // Delete the tag itself
      await model.destroyPermanently();
    });

    return true;
  }

  // ============================================
  // TagAssignment Operations
  // ============================================

  async assignTag(tagId: Ulid, targetType: LinkableType, targetId: Ulid): Promise<TagAssignment> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    // Check if assignment already exists (idempotent)
    const existing = await collection
      .query(
        Q.where('tag_id', tagId),
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();

    if (existing.length > 0) {
      return assignmentToDomain(existing[0]);
    }

    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((assignment) => {
        assignment.tagId = tagId;
        assignment.targetType = targetType;
        assignment.targetId = targetId;
        // Set readonly field via _raw
        (assignment._raw as Record<string, unknown>).created_at = now;
      });
    });

    return assignmentToDomain(created);
  }

  async unassignTag(tagId: Ulid, targetType: LinkableType, targetId: Ulid): Promise<boolean> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    const existing = await collection
      .query(
        Q.where('tag_id', tagId),
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetch();

    if (existing.length === 0) {
      return true; // Idempotent - already unassigned
    }

    await this.database.write(async () => {
      await existing[0].destroyPermanently();
    });

    return true;
  }

  async findTagsForItem(targetType: LinkableType, targetId: Ulid): Promise<Tag[]> {
    const assignmentCollection = this.database.get<TagAssignmentModel>('tag_assignments');
    const tagCollection = this.database.get<TagModel>('tags');

    // Get all assignments for this item
    const assignments = await assignmentCollection
      .query(Q.where('target_type', targetType), Q.where('target_id', targetId))
      .fetch();

    if (assignments.length === 0) {
      return [];
    }

    // Get the tags
    const tagIds = assignments.map((a) => a.tagId);
    const tags = await tagCollection.query(Q.where('id', Q.oneOf(tagIds))).fetch();

    return tags.map(tagToDomain);
  }

  async findItemsWithTag(tagId: Ulid, targetType?: LinkableType): Promise<TaggedItemRef[]> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    const conditions: Q.Clause[] = [Q.where('tag_id', tagId)];

    if (targetType !== undefined) {
      conditions.push(Q.where('target_type', targetType));
    }

    const assignments = await collection.query(...conditions).fetch();

    return assignments.map((a) => ({
      type: a.targetType as LinkableType,
      id: a.targetId as Ulid,
    }));
  }

  async hasTag(tagId: Ulid, targetType: LinkableType, targetId: Ulid): Promise<boolean> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    const count = await collection
      .query(
        Q.where('tag_id', tagId),
        Q.where('target_type', targetType),
        Q.where('target_id', targetId)
      )
      .fetchCount();

    return count > 0;
  }

  async removeAllTagsFromItem(targetType: LinkableType, targetId: Ulid): Promise<number> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    const assignments = await collection
      .query(Q.where('target_type', targetType), Q.where('target_id', targetId))
      .fetch();

    if (assignments.length === 0) {
      return 0;
    }

    await this.database.write(async () => {
      for (const assignment of assignments) {
        await assignment.destroyPermanently();
      }
    });

    return assignments.length;
  }

  async countItemsWithTag(tagId: Ulid, targetType?: LinkableType): Promise<number> {
    const collection = this.database.get<TagAssignmentModel>('tag_assignments');

    const conditions: Q.Clause[] = [Q.where('tag_id', tagId)];

    if (targetType !== undefined) {
      conditions.push(Q.where('target_type', targetType));
    }

    return collection.query(...conditions).fetchCount();
  }
}
