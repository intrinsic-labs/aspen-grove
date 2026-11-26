import type { IBufferDraftStore } from '@application/repositories/core/IBufferDraftStore';
import type { BufferDraft } from '@application/services/buffer/buffer-draft';
import type { ULID } from '@domain/value-objects';

/**
 * Keeps and clears the recovery draft of a buffer path. Typing and
 * backgrounding only ever call these; they never write a version.
 */
export class StoreBufferDraftUseCase {
  constructor(private readonly store: IBufferDraftStore) {}

  put(draft: BufferDraft): Promise<void> {
    return this.store.put(draft);
  }

  discard(treeId: ULID, pathId: ULID): Promise<void> {
    return this.store.remove(treeId, pathId);
  }
}
