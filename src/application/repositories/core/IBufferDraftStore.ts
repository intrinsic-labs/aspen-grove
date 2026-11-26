import type { ULID } from '@domain/value-objects';
import type { BufferDraft } from '@application/services/buffer/buffer-draft';

export interface StoredBufferDraft {
  readonly draft: BufferDraft;
  readonly conflicted: boolean;
}

export interface IBufferDraftStore {
  get(
    treeId: ULID,
    pathId: ULID,
    sequence: readonly ULID[],
    revision: number
  ): Promise<StoredBufferDraft | null>;
  put(draft: BufferDraft): Promise<void>;
  /** With an expected draft, clear only the snapshot that just committed. */
  remove(treeId: ULID, pathId: ULID, expected?: BufferDraft): Promise<void>;
}
