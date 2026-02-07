import { Document, DocumentBlock } from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for Document persistence operations.
 * Infrastructure layer implements this contract.
 */
export interface IDocumentRepository {
  // === Basic CRUD ===

  /** Find a Document by ID, or null if not found. */
  findById(id: ULID): Promise<Document | null>;

  /** Create a new Document. */
  create(input: CreateDocumentInput): Promise<Document>;

  /** Update a Document's mutable fields. */
  update(input: UpdateDocumentInput): Promise<Document>;

  /** Soft delete by setting archivedAt timestamp. */
  archive(id: ULID): Promise<Document>;

  /** Restore a previously archived document. */
  restore(id: ULID): Promise<Document>;

  /** Permanently delete a Document. */
  hardDelete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find all documents in a grove. Defaults to active (non-archived) only. */
  findByGroveId(
    groveId: ULID,
    onlyActive?: boolean,
    limit?: number,
    offset?: number
  ): Promise<Document[]>;

  /** Search documents by title (case-insensitive partial match). */
  findByTitle(
    groveId: ULID,
    titleQuery: string,
    onlyActive?: boolean
  ): Promise<Document[]>;

  // === Block Operations ===

  /**
   * Replace all blocks in a document.
   * Use for full document rewrites.
   */
  replaceBlocks(id: ULID, blocks: readonly DocumentBlock[]): Promise<Document>;

  /**
   * Replace a single block at a specific index.
   * Use for updating individual blocks (e.g., fixing typos, swapping images).
   */
  replaceBlockAt(
    id: ULID,
    index: number,
    block: DocumentBlock
  ): Promise<Document>;

  /**
   * Insert blocks at a specific index.
   * Existing blocks at and after the index are shifted.
   */
  insertBlocksAt(
    id: ULID,
    index: number,
    blocks: readonly DocumentBlock[]
  ): Promise<Document>;

  /**
   * Remove blocks by index range (inclusive start, exclusive end).
   */
  removeBlocksRange(
    id: ULID,
    startIndex: number,
    endIndex: number
  ): Promise<Document>;

  // === Summary ===

  /** Update the auto-generated summary. */
  updateSummary(id: ULID, summary: string): Promise<Document>;
}

/** Input for creating a new Document. */
export type CreateDocumentInput = {
  readonly groveId: ULID;
  readonly title?: string;
  readonly blocks?: readonly DocumentBlock[];
};

/** Input for updating a Document's mutable fields. */
export type UpdateDocumentInput = {
  readonly id: ULID;
  readonly changes: {
    readonly title?: string;
  };
};
