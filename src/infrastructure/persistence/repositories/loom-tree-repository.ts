/**
 * LoomTree Repository Implementation
 *
 * WatermelonDB implementation of ILoomTreeRepository.
 * Manages persistence for LoomTree entities (branching conversation containers).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  ILoomTreeRepository,
  Pagination,
  PaginatedResult,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  LoomTree,
  CreateLoomTreeInput,
  UpdateLoomTreeInput,
  LoomTreeFilters,
  Ulid,
  Content,
} from '../../../domain';
import {
  NotFoundError,
  NotImplementedError,
  AuthorType,
  DEFAULT_NODE_METADATA,
} from '../../../domain';
import { generateUlid, generateLocalId } from '../../../domain/values';
import { LoomTreeModel, NodeModel, EdgeModel } from '../models';

/**
 * Convert a LoomTreeModel to a domain LoomTree entity.
 */
function toDomain(model: LoomTreeModel): LoomTree {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of LoomTree repository.
 */
export class LoomTreeRepository implements ILoomTreeRepository {
  constructor(private database: Database) {}

  async create(input: CreateLoomTreeInput): Promise<LoomTree> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');
    const nodesCollection = this.database.get<NodeModel>('nodes');

    const now = Date.now();
    const rootNodeId = generateUlid();
    const rootLocalId = generateLocalId(rootNodeId, new Set());

    // Derive title from initial content or use default
    let title = input.title;
    if (!title && input.initialContent) {
      const content = input.initialContent.content as Content;
      if (content.type === 'text') {
        title = content.text.slice(0, 50).trim() || `Loom Tree ${now}`;
      }
    }
    title = title || `Loom Tree ${now}`;

    const created = await this.database.write(async () => {
      // Create the root node first
      await nodesCollection.create((node) => {
        node._raw.id = rootNodeId;
        node.localId = rootLocalId;
        node.loomTreeId = input.id;
        node.content = (input.initialContent?.content as Content) ?? { type: 'text', text: '' };
        node.summary = null;
        node.authorAgentId = input.initialContent?.authorAgentId ?? '';
        node.authorType = AuthorType.Human; // Default for root
        node.contentHash = ''; // Will be computed by caller
        node.metadata = DEFAULT_NODE_METADATA;
        node.editedFrom = null;
      });

      // Create the tree
      const tree = await treesCollection.create((t) => {
        t._raw.id = input.id;
        t.groveId = input.groveId;
        t.title = title!;
        t.description = input.description ?? null;
        t.summary = null;
        t.rootNodeId = rootNodeId;
        t.mode = input.mode;
        t.systemContext = input.systemContext ?? null;
        t.createdAt = now;
        t.updatedAt = now;
        t.archivedAt = null;
      });

      return tree;
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<LoomTree | null> {
    try {
      const treesCollection = this.database.get<LoomTreeModel>('loom_trees');
      const model = await treesCollection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByGrove(
    groveId: Ulid,
    filters?: LoomTreeFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<LoomTree>> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    if (filters?.mode) {
      conditions.push(Q.where('mode', filters.mode));
    }

    if (filters?.search) {
      conditions.push(
        Q.or(
          Q.where('title', Q.like(`%${Q.sanitizeLikeString(filters.search)}%`)),
          Q.where('description', Q.like(`%${Q.sanitizeLikeString(filters.search)}%`))
        )
      );
    }

    const query = treesCollection.query(...conditions);
    const total = await query.fetchCount();

    let results: LoomTreeModel[];
    if (pagination) {
      results = await query
        .extend(Q.sortBy('updated_at', Q.desc), Q.skip(pagination.offset), Q.take(pagination.limit))
        .fetch();
    } else {
      results = await query.extend(Q.sortBy('updated_at', Q.desc)).fetch();
    }

    return {
      items: results.map(toDomain),
      total,
      hasMore: pagination ? pagination.offset + results.length < total : false,
    };
  }

  async update(id: Ulid, changes: UpdateLoomTreeInput): Promise<LoomTree> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    let model: LoomTreeModel;
    try {
      model = await treesCollection.find(id);
    } catch {
      throw new NotFoundError('LoomTree', id);
    }

    await this.database.write(async () => {
      await model.update((tree) => {
        if (changes.title !== undefined) {
          tree.title = changes.title;
        }
        if (changes.description !== undefined) {
          tree.description = changes.description;
        }
        if (changes.systemContext !== undefined) {
          tree.systemContext = changes.systemContext;
        }
        tree.updatedAt = Date.now();
      });
    });

    return toDomain(model);
  }

  async regenerateSummary(id: Ulid): Promise<LoomTree> {
    // This requires LLM integration - will be implemented in Phase 4
    throw new NotImplementedError(
      'regenerateSummary',
      'Summary generation requires LLM integration (Phase 4)'
    );
  }

  async archive(id: Ulid): Promise<boolean> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    let model: LoomTreeModel;
    try {
      model = await treesCollection.find(id);
    } catch {
      throw new NotFoundError('LoomTree', id);
    }

    await model.archive();
    return true;
  }

  async restore(id: Ulid): Promise<boolean> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    let model: LoomTreeModel;
    try {
      model = await treesCollection.find(id);
    } catch {
      throw new NotFoundError('LoomTree', id);
    }

    await model.restore();
    return true;
  }

  async delete(id: Ulid): Promise<boolean> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');
    const nodesCollection = this.database.get<NodeModel>('nodes');
    const edgesCollection = this.database.get<EdgeModel>('edges');

    let tree: LoomTreeModel;
    try {
      tree = await treesCollection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      // Delete all edges in the tree
      const edges = await edgesCollection.query(Q.where('loom_tree_id', id)).fetch();
      for (const edge of edges) {
        await edge.markAsDeleted();
      }

      // Delete all nodes in the tree
      const nodes = await nodesCollection.query(Q.where('loom_tree_id', id)).fetch();
      for (const node of nodes) {
        await node.markAsDeleted();
      }

      // Delete the tree itself
      await tree.markAsDeleted();
    });

    return true;
  }

  async exists(id: Ulid): Promise<boolean> {
    const tree = await this.findById(id);
    return tree !== null;
  }

  async count(groveId: Ulid, filters?: LoomTreeFilters): Promise<number> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    if (filters?.mode) {
      conditions.push(Q.where('mode', filters.mode));
    }

    return treesCollection.query(...conditions).fetchCount();
  }

  observeById(id: Ulid): Observable<LoomTree | null> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    return {
      subscribe: (
        observerOrNext: Observer<LoomTree | null> | ((value: LoomTree | null) => void)
      ) => {
        const observer: Observer<LoomTree | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = treesCollection.findAndObserve(id).subscribe({
          next: (model) => observer.next(toDomain(model)),
          error: () => observer.next(null),
        });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }

  observeByGrove(groveId: Ulid, filters?: LoomTreeFilters): Observable<LoomTree[]> {
    const treesCollection = this.database.get<LoomTreeModel>('loom_trees');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    if (filters?.mode) {
      conditions.push(Q.where('mode', filters.mode));
    }

    return {
      subscribe: (observerOrNext: Observer<LoomTree[]> | ((value: LoomTree[]) => void)) => {
        const observer: Observer<LoomTree[]> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = treesCollection
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
