import type {
  BufferDraft,
  BufferSwitchAction,
} from '@application/services/buffer/buffer-draft';
import type { BufferDocument } from '@application/services/buffer/document-ranges';
import { draftFromDocument } from '@application/services/buffer/draft-from-document';
import { reserveBufferDraft } from '@application/services/buffer/reserve-buffer-draft';
import {
  recoveryText,
  settleStoredDraft,
} from '@application/services/buffer/settle-stored-draft';
import type { CommitBufferChangesUseCase } from '@application/use-cases/CommitBufferChangesUseCase';
import type {
  OpenBufferDocumentUseCase,
  OpenedBufferDocument,
} from '@application/use-cases/OpenBufferDocumentUseCase';
import type { StoreBufferDraftUseCase } from '@application/use-cases/StoreBufferDraftUseCase';
import type { SwitchBufferPathUseCase } from '@application/use-cases/SwitchBufferPathUseCase';
import { createULID, type ULID } from '@domain/value-objects';

export type BufferSessionDeps = {
  readonly treeId: ULID;
  readonly open: Pick<OpenBufferDocumentUseCase, 'execute'>;
  readonly commit: Pick<CommitBufferChangesUseCase, 'execute'>;
  readonly switchPath: Pick<SwitchBufferPathUseCase, 'execute'>;
  readonly drafts: Pick<StoreBufferDraftUseCase, 'put' | 'discard'>;
  readonly newId?: () => ULID;
  readonly now?: () => number;
};

/** An unsaved draft that could not be replayed, kept in the store for the user. */
export type BufferRecovery = {
  readonly draft: BufferDraft;
  readonly reason: 'conflicted' | 'failed';
  readonly message: string;
  /** The document with the draft applied, for "Copy unsaved text". */
  readonly text: string;
};

export type BufferLoad = {
  readonly opened: OpenedBufferDocument;
  readonly recovery?: BufferRecovery;
};

export type BufferCommandResult =
  | { readonly kind: 'done'; readonly opened: OpenedBufferDocument }
  /** A commit with nothing typed: no draft, no version. */
  | { readonly kind: 'nothing' }
  /** The typed text stays on screen and in the store. */
  | { readonly kind: 'failed'; readonly message: string };

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * One open buffer tree and the draft behind it. It is plain TypeScript so the
 * hooks stay thin: it opens the stored path, replays what an earlier session
 * left, keeps the typing as a reserved draft, and saves it through the 4b
 * commands. Everything runs one after another, so a late `save` can never
 * undo a command that finished before it.
 */
export class BufferDocumentSession {
  private current: OpenedBufferDocument | undefined;
  private reserved: BufferDraft | undefined;
  private recovering = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: BufferSessionDeps) {}

  get opened(): OpenedBufferDocument | undefined {
    return this.current;
  }

  /** Opens the tree, replaying a stored draft first. */
  load(): Promise<BufferLoad> {
    return this.enqueue(async () => {
      const { treeId, open, commit } = this.deps;
      let opened = await open.execute({ treeId });
      let recovery: BufferRecovery | undefined;
      const outcome = await settleStoredDraft(opened.storedDraft, (draft) =>
        commit.execute({ treeId, pathId: opened.pathId, draft })
      );
      if (outcome.kind === 'applied') opened = await open.execute({ treeId });
      if (outcome.kind === 'recover') {
        recovery = {
          draft: outcome.draft,
          reason: outcome.reason,
          message: outcome.message,
          text: recoveryText(outcome.draft, opened.passages),
        };
      }
      this.current = opened;
      this.reserved = undefined;
      this.recovering = recovery !== undefined;
      return { opened, recovery };
    });
  }

  /**
   * Stores the typing as the recovery draft, or clears it when the document
   * is back to what was opened. It never writes a version. While a recovery
   * draft is waiting for the user it is left alone.
   */
  save(document: BufferDocument): Promise<void> {
    return this.enqueue(async () => {
      const opened = this.current;
      if (!opened || this.recovering) return;
      const draft = await this.prepare(opened, document);
      if (draft) {
        await this.deps.drafts.put(draft);
        this.reserved = draft;
      } else if (this.reserved) {
        this.reserved = undefined;
        await this.deps.drafts.discard(opened.treeId, opened.pathId);
      }
    });
  }

  /** Commits the typing as new versions. Nothing typed commits nothing. */
  commit(document: BufferDocument): Promise<BufferCommandResult> {
    return this.enqueue(() => this.command(document));
  }

  /** Commits the typing, then switches to the chosen branch or version. */
  switchTo(
    document: BufferDocument,
    action: BufferSwitchAction
  ): Promise<BufferCommandResult> {
    return this.enqueue(() => this.command(document, action));
  }

  /** The user gave up the recovery draft: clear it and resume saving. */
  dismissRecovery(): Promise<void> {
    return this.enqueue(async () => {
      const opened = this.current;
      if (opened) await this.deps.drafts.discard(opened.treeId, opened.pathId);
      this.recovering = false;
      this.reserved = undefined;
    });
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(run);
    this.queue = next;
    return next;
  }

  private prepare(
    opened: OpenedBufferDocument,
    document: BufferDocument,
    action?: BufferSwitchAction
  ): Promise<BufferDraft | null> {
    const text = draftFromDocument(opened, document, {
      keepEmpty: action !== undefined,
    });
    if (!text) return Promise.resolve(null);
    return reserveBufferDraft(opened.graph, opened.path, text, {
      newId: this.deps.newId ?? createULID,
      now: this.deps.now ?? Date.now,
      selections: opened.selections,
      action,
      previous: this.reserved,
      isCommitted: (operationId) => opened.headOperationId === operationId,
    });
  }

  private async command(
    document: BufferDocument,
    action?: BufferSwitchAction
  ): Promise<BufferCommandResult> {
    const opened = this.current;
    if (!opened || this.recovering)
      return { kind: 'failed', message: 'Unsaved text needs attention first' };
    const { treeId, pathId } = opened;
    let draft: BufferDraft | null = null;
    try {
      draft = await this.prepare(opened, document, action);
      if (!draft) return { kind: 'nothing' };
      // The draft and its switch are stored before the command runs, so a
      // lost acknowledgement replays exactly this command on the next open.
      await this.deps.drafts.put(draft);
      this.reserved = draft;
      await (action
        ? this.deps.switchPath.execute({ treeId, pathId, draft, action })
        : this.deps.commit.execute({ treeId, pathId, draft }));
      return await this.settled();
    } catch (error) {
      return this.failed(error, draft);
    }
  }

  private async settled(): Promise<BufferCommandResult> {
    const opened = await this.deps.open.execute({ treeId: this.deps.treeId });
    this.current = opened;
    this.reserved = undefined;
    return { kind: 'done', opened };
  }

  /**
   * A command that threw may still have committed (the batch landed, the
   * acknowledgement did not). The path itself says so: its first row names the
   * last operation. Otherwise the text stays, in the store and on screen.
   */
  private async failed(
    error: unknown,
    draft: BufferDraft | null
  ): Promise<BufferCommandResult> {
    try {
      const probe = await this.deps.open.execute({
        treeId: this.deps.treeId,
      });
      if (draft && probe.headOperationId === draft.operationId) {
        await this.deps.drafts
          .discard(probe.treeId, probe.pathId)
          .catch(() => undefined);
        this.current = probe;
        this.reserved = undefined;
        return { kind: 'done', opened: probe };
      }
      // Remember what is stored now, so a later reservation can tell.
      if (this.current)
        this.current = {
          ...this.current,
          headOperationId: probe.headOperationId,
        };
    } catch {
      // Keep what was opened; the message below is the one that matters.
    }
    return { kind: 'failed', message: messageOf(error) };
  }
}
