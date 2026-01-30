/**
 * Document Repository Interface
 *
 * Abstract contract for Document persistence operations.
 * Documents are mutable rich-text containers for notes and artifacts.
 *
 * NOTE: Full implementation deferred to Phase 10.
 * This interface is defined now for clean architecture compliance.
 */

import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilters,
  Ulid,
} from '../../domain';
import type { Pagination, PaginatedResult } from './common';

/**
 * Simple observable interface for reactive queries.
 */
export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

/**
 * Document repository interface.
 *
 * Manages persistence for Document entities. Unlike Nodes (which are immutable),
 * Documents can be freely edited and updated.
 *
 * @remarks Full implementation planned for Phase 10 (Documents & Organization).
 */
export interface IDocumentRepository {
  /**
   * Create a new Document.
   *
   * @param input - Document creation parameters
   * @returns The created Document with summary initially null
   */
  create(input: CreateDocumentInput): Promise<Document>;

  /**
   * Find a Document by ID.
   *
   * @param id - Document ULID
   * @returns The Document or null if not found
   */
  findById(id: Ulid): Promise<Document | null>;

  /**
   * List Documents in a Grove with optional filtering and pagination.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters (archived, search)
   * @param pagination - Optional pagination parameters
   * @returns Paginated array of Documents
   */
  findByGrove(
    groveId: Ulid,
    filters?: DocumentFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<Document>>;

  /**
   * Update Document content.
   *
   * Note: Replaces blocks array entirely (not partial update).
   * Summary is managed via regenerateSummary, not direct update.
   *
   * @param id - Document ULID
   * @param changes - Properties to update
   * @returns The updated Document
   * @throws NotFoundError if Document doesn't exist
   */
  update(id: Ulid, changes: UpdateDocumentInput): Promise<Document>;

  /**
   * Regenerate the Document summary.
   *
   * Analyzes document title and text block content,
   * generates new summary via summarization model.
   *
   * @param id - Document ULID
   * @returns The updated Document
   * @throws NotFoundError if Document doesn't exist
   * @throws NotImplementedError until LLM integration
   */
  regenerateSummary(id: Ulid): Promise<Document>;

  /**
   * Soft-delete a Document (set archivedAt).
   *
   * @param id - Document ULID
   * @returns true if successful
   * @throws NotFoundError if Document doesn't exist
   */
  archive(id: Ulid): Promise<boolean>;

  /**
   * Restore an archived Document (clear archivedAt).
   *
   * @param id - Document ULID
   * @returns true if successful
   * @throws NotFoundError if Document doesn't exist
   */
  restore(id: Ulid): Promise<boolean>;

  /**
   * Hard-delete a Document.
   *
   * Removes Document and related Links.
   * Does not remove referenced Nodes or LoomTrees.
   *
   * @param id - Document ULID
   * @returns true if successful
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Check if a Document exists.
   *
   * @param id - Document ULID
   * @returns true if the Document exists
   */
  exists(id: Ulid): Promise<boolean>;

  /**
   * Count Documents in a Grove.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters
   * @returns Count of matching Documents
   */
  count(groveId: Ulid, filters?: DocumentFilters): Promise<number>;

  // ============================================
  // Observable Methods (for reactive UI updates)
  // ============================================

  /**
   * Observe a Document for changes.
   *
   * Returns an observable that emits whenever the Document is updated.
   *
   * @param id - Document ULID
   * @returns Observable of Document updates
   */
  observe(id: Ulid): Observable<Document | null>;

  /**
   * Observe Documents in a Grove.
   *
   * Returns an observable that emits when any Document in the Grove changes.
   *
   * @param groveId - Parent Grove ULID
   * @param filters - Optional filters
   * @returns Observable of Document arrays
   */
  observeByGrove(
    groveId: Ulid,
    filters?: DocumentFilters
  ): Observable<Document[]>;
}
