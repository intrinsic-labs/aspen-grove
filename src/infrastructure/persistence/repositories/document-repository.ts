/**
 * Document Repository Implementation (Stub)
 *
 * WatermelonDB implementation of IDocumentRepository.
 * Manages persistence for Document entities (mutable rich-text containers).
 *
 * NOTE: This is a stub implementation for Phase 1.
 * Full implementation planned for Phase 10 (Documents & Organization).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  IDocumentRepository,
  Pagination,
  PaginatedResult,
  Observable,
  Observer,
} from '../../../application/repositories';
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilters,
  Ulid,
} from '../../../domain';
import { NotFoundError, NotImplementedError } from '../../../domain';
import { DocumentModel } from '../models';

/**
 * Convert a DocumentModel to a domain Document entity.
 */
function toDomain(model: DocumentModel): Document {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of Document repository.
 *
 * @remarks Stub implementation - some methods throw NotImplementedError
 */
export class DocumentRepository implements IDocumentRepository {
  constructor(private database: Database) {}

  async create(input: CreateDocumentInput): Promise<Document> {
    const collection = this.database.get<DocumentModel>('documents');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((doc) => {
        doc._raw.id = input.id;
        doc.groveId = input.groveId;
        doc.title = input.title;
        doc.summary = null;
        doc.blocks = input.blocks ?? [];
        doc.createdAt = now;
        doc.updatedAt = now;
        doc.archivedAt = null;
      });
    });

    return toDomain(created);
  }

  async findById(id: Ulid): Promise<Document | null> {
    try {
      const collection = this.database.get<DocumentModel>('documents');
      const model = await collection.find(id);
      return toDomain(model);
    } catch {
      return null;
    }
  }

  async findByGrove(
    groveId: Ulid,
    filters?: DocumentFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Document>> {
    const collection = this.database.get<DocumentModel>('documents');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    const query = collection.query(...conditions);
    const total = await query.fetchCount();

    let results: DocumentModel[];
    if (pagination) {
      results = await query
        .extend(Q.skip(pagination.offset), Q.take(pagination.limit))
        .fetch();
    } else {
      results = await query.fetch();
    }

    return {
      items: results.map(toDomain),
      total,
      hasMore: pagination ? pagination.offset + results.length < total : false,
    };
  }

  async update(id: Ulid, changes: UpdateDocumentInput): Promise<Document> {
    const collection = this.database.get<DocumentModel>('documents');

    let model: DocumentModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('Document', id);
    }

    await this.database.write(async () => {
      await model.update((doc) => {
        if (changes.title !== undefined) {
          doc.title = changes.title;
        }
        if (changes.blocks !== undefined) {
          doc.blocks = changes.blocks;
        }
        doc.updatedAt = Date.now();
      });
    });

    return toDomain(model);
  }

  async regenerateSummary(id: Ulid): Promise<Document> {
    // Requires LLM integration - defer to later phase
    throw new NotImplementedError('DocumentRepository.regenerateSummary');
  }

  async archive(id: Ulid): Promise<boolean> {
    const collection = this.database.get<DocumentModel>('documents');

    let model: DocumentModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('Document', id);
    }

    await this.database.write(async () => {
      await model.update((doc) => {
        doc.archivedAt = Date.now();
        doc.updatedAt = Date.now();
      });
    });

    return true;
  }

  async restore(id: Ulid): Promise<boolean> {
    const collection = this.database.get<DocumentModel>('documents');

    let model: DocumentModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('Document', id);
    }

    await this.database.write(async () => {
      await model.update((doc) => {
        doc.archivedAt = null;
        doc.updatedAt = Date.now();
      });
    });

    return true;
  }

  async delete(id: Ulid): Promise<boolean> {
    const collection = this.database.get<DocumentModel>('documents');

    let model: DocumentModel;
    try {
      model = await collection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      await model.destroyPermanently();
    });

    return true;
  }

  async exists(id: Ulid): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }

  async count(groveId: Ulid, filters?: DocumentFilters): Promise<number> {
    const collection = this.database.get<DocumentModel>('documents');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    return collection.query(...conditions).fetchCount();
  }

  observe(id: Ulid): Observable<Document | null> {
    const collection = this.database.get<DocumentModel>('documents');

    return {
      subscribe: (
        observerOrNext: Observer<Document | null> | ((value: Document | null) => void)
      ) => {
        const observer: Observer<Document | null> =
          typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

        const subscription = collection.findAndObserve(id).subscribe({
          next: (model) => observer.next(toDomain(model)),
          error: () => observer.next(null),
        });

        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }

  observeByGrove(groveId: Ulid, filters?: DocumentFilters): Observable<Document[]> {
    const collection = this.database.get<DocumentModel>('documents');

    const conditions: Q.Clause[] = [Q.where('grove_id', groveId)];

    if (filters?.archived === false) {
      conditions.push(Q.where('archived_at', null));
    } else if (filters?.archived === true) {
      conditions.push(Q.where('archived_at', Q.notEq(null)));
    }

    return {
      subscribe: (
        observerOrNext: Observer<Document[]> | ((value: Document[]) => void)
      ) => {
        const observer: Observer<Document[]> =
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
