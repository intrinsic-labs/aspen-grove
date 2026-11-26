import type { StoredBufferDraft } from '@application/repositories/core/IBufferDraftStore';
import type { ULID } from '@domain/value-objects';
import type { BufferDraft } from './buffer-draft';

export type StoredDraftOutcome =
  | { readonly kind: 'none' }
  /** The draft's command ran (or had already run); the store is cleared. */
  | { readonly kind: 'applied' }
  /** The draft could not be replayed; it stays stored and is offered to the user. */
  | {
      readonly kind: 'recover';
      readonly draft: BufferDraft;
      readonly reason: 'conflicted' | 'failed';
      readonly message: string;
    };

/**
 * What to do with the draft found when a buffer opens. Every stored draft is
 * replayed through its own command, conflicted or not: the store calls a draft
 * conflicted when the path moved on since it was written, and that is also
 * what a lost acknowledgement looks like (the batch landed, the clear did
 * not). The command recognises its own operation and clears it; for a draft
 * that really is stale it throws before writing anything. Only a replay that
 * fails is offered for recovery, and the draft stays in the store.
 */
export const settleStoredDraft = async (
  stored: StoredBufferDraft | null,
  replay: (draft: BufferDraft) => Promise<unknown>
): Promise<StoredDraftOutcome> => {
  if (!stored) return { kind: 'none' };
  try {
    await replay(stored.draft);
    return { kind: 'applied' };
  } catch (error) {
    return {
      kind: 'recover',
      draft: stored.draft,
      reason: stored.conflicted ? 'conflicted' : 'failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * The text a recovery draft carries, for "Copy unsaved text": the whole
 * document with the draft applied when its edits belong to the passages that
 * are open, otherwise just the typed pieces.
 */
export const recoveryText = (
  draft: BufferDraft,
  passages: readonly { readonly nodeId: ULID; readonly text: string }[]
): string => {
  const edits = new Map(draft.edits.map((edit) => [edit.nodeId, edit.text]));
  const known = new Set(passages.map((passage) => passage.nodeId));
  if (draft.edits.every((edit) => known.has(edit.nodeId))) {
    return (
      passages.map((p) => edits.get(p.nodeId) ?? p.text).join('') +
      draft.workingTail
    );
  }
  return [...edits.values(), draft.workingTail]
    .filter((text) => text.length > 0)
    .join('\n\n');
};
