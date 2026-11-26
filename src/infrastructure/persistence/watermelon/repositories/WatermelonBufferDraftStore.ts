import { Q, type Database } from '@nozbe/watermelondb';
import type { IBufferDraftStore } from '@application/repositories/core/IBufferDraftStore';
import type { BufferDraft } from '@application/services/buffer/buffer-draft';
import type { ULID } from '@domain/value-objects';
import { Path } from '../model/Path';

/** Key-order-independent JSON, so equal drafts compare equal however built. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0
          )
        )
      : v
  );

/**
 * The snapshot a command was built from. The switch it carries is part of
 * the command, not of the typing, so a stored draft saved before the switch
 * was chosen still matches the command that committed it.
 */
const typingOf = ({ action: _action, ...typing }: BufferDraft) => typing;

export const bufferDraftKey = (treeId: string, pathId: string) =>
  `buffer.draft.${treeId}.${pathId}`;

export class WatermelonBufferDraftStore implements IBufferDraftStore {
  constructor(private readonly db: Database) {}

  async get(
    treeId: ULID,
    pathId: ULID,
    sequence: readonly ULID[],
    revision: number
  ) {
    const draft = await this.db.localStorage.get<BufferDraft>(
      bufferDraftKey(treeId, pathId)
    );
    if (!draft) return null;
    const conflicted =
      draft.expectedRevision !== revision ||
      draft.expectedSequence.length !== sequence.length ||
      draft.expectedSequence.some((id, i) => id !== sequence[i]);
    return { draft, conflicted };
  }

  put(draft: BufferDraft): Promise<void> {
    return this.db.write(async () => {
      const count = await this.db
        .get<Path>('paths')
        .query(
          Q.where('id', draft.pathId),
          Q.where('loom_tree_id', draft.treeId)
        )
        .fetchCount();
      if (!count) throw new Error('Missing buffer draft path');
      await this.db.localStorage.set(
        bufferDraftKey(draft.treeId, draft.pathId),
        draft
      );
    });
  }

  remove(treeId: ULID, pathId: ULID, expected?: BufferDraft): Promise<void> {
    return this.db.write(async () => {
      const key = bufferDraftKey(treeId, pathId);
      if (expected) {
        const stored = await this.db.localStorage.get<BufferDraft>(key);
        if (
          !stored ||
          canonical(typingOf(stored)) !== canonical(typingOf(expected))
        )
          return;
      }
      await this.db.localStorage.remove(key);
    });
  }
}
