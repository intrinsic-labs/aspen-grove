import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BufferSwitchAction } from '@application/services/buffer/buffer-draft';
import type { BufferPositionChoices } from '@application/services/buffer/buffer-choices';
import type { OpenedBufferDocument } from '@application/use-cases/OpenBufferDocumentUseCase';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import {
  BufferDocumentSession,
  type BufferCommandResult,
  type BufferRecovery,
} from './buffer-document-session';
import {
  caretOnReload,
  passageIndexAt,
  previewFromPassages,
  rebaseTyping,
} from './buffer-passages-document';
import { emptyPreview } from './buffer-preview-document';
import type { BufferSelection } from './derive-replacement';
import type { CompositionBarrier } from './composition-barrier';
import { useBufferDraftLifecycle } from './useBufferDraftLifecycle';
import { useBufferEditorFeed } from './useBufferEditorFeed';

export type BufferDocumentStatus = 'loading' | 'ready' | 'error';

type EditorAccess = {
  readonly enabled: boolean;
  readonly status: BufferDocumentStatus;
  readonly commandRunning: boolean;
  readonly recoveryPending: boolean;
};

export const bufferReadOnly = ({
  enabled,
  status,
  commandRunning,
  recoveryPending,
}: EditorAccess): boolean =>
  enabled && (status !== 'ready' || commandRunning || recoveryPending);

/**
 * A buffer tree's real document: opened on its stored path, edited through
 * the same feed as the preview, kept as a draft while typing, and saved by
 * `commit()` or a switch. It owns no storage logic (that is
 * `BufferDocumentSession`); it holds state and wires the editor to it.
 * `enabled` is false while a fixture is showing, so the fixture never
 * touches the database.
 */
export const useBufferDocument = (
  tree: LoomTree,
  barrier: CompositionBarrier,
  enabled: boolean
) => {
  const { useCases } = useAppServices();
  const feed = useBufferEditorFeed(barrier, emptyPreview);
  const { latest, setDoc, doc } = feed;
  const session = useMemo(
    () =>
      new BufferDocumentSession({
        treeId: tree.id,
        open: useCases.openBufferDocumentUseCase,
        commit: useCases.commitBufferChangesUseCase,
        switchPath: useCases.switchBufferPathUseCase,
        drafts: useCases.storeBufferDraftUseCase,
      }),
    [tree.id, useCases]
  );
  const [status, setStatus] = useState<BufferDocumentStatus>('loading');
  const [commandRunning, setCommandRunning] = useState(false);
  const [reload, setReload] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [choices, setChoices] = useState<readonly BufferPositionChoices[]>([]);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<BufferRecovery | null>(null);
  const [caret, setCaret] = useState<number | undefined>();
  // A command is running (or the document is loading): the draft waits.
  const caretRef = useRef<number | undefined>(undefined);
  const busy = useRef(true);
  const inflight = useRef<Promise<boolean> | null>(null);

  const show = useCallback(
    (
      opened: OpenedBufferDocument,
      rebaseOn?: typeof doc,
      switchedPosition?: number
    ) => {
      const snapshot = rebaseOn;
      const reloaded = previewFromPassages(opened.passages);
      const current = latest();
      const typedSince =
        snapshot !== undefined &&
        current.index.document !== snapshot.index.document;
      barrier.reset();
      setDoc(snapshot ? rebaseTyping(reloaded, snapshot, current) : reloaded);
      if (!typedSince) setEpoch((value) => value + 1);
      setChoices(opened.choices);
      // The native caret does not move, so the pill must stay where it was.
      const kept = caretOnReload(caretRef.current, reloaded, switchedPosition);
      caretRef.current = kept;
      setCaret(kept);
    },
    [barrier, latest, setDoc]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    busy.current = true;
    setStatus('loading');
    session
      .load()
      .then(({ opened, recovery: found }) => {
        if (cancelled) return;
        show(opened);
        setRecovery(found ?? null);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      })
      .finally(() => {
        if (!cancelled) busy.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, session, show, reload]);

  const lifecycle = useBufferDraftLifecycle({
    session,
    getDocument: useCallback(() => latest().index.document, [latest]),
    active: useCallback(() => !busy.current, []),
    document: doc.index.document,
    enabled: enabled && status === 'ready',
  });

  /** Waits for composition to end, then runs `command` on the newest text. */
  const run = useCallback(
    (
      command: (
        document: ReturnType<typeof latest>['index']['document']
      ) => Promise<BufferCommandResult>,
      keepsText: boolean,
      switchedPosition?: number
    ): Promise<boolean> => {
      if (inflight.current) return inflight.current;
      if (!enabled || status !== 'ready' || recovery)
        return Promise.resolve(false);
      setCommandRunning(true);
      const task = (async () => {
        await new Promise<void>((resolve) => barrier.run(resolve));
        lifecycle.cancel();
        busy.current = true;
        const snapshot = latest();
        try {
          const result = await command(snapshot.index.document);
          if (result.kind === 'failed') {
            setCommitError(result.message);
            return false;
          }
          if (result.kind === 'done') {
            // Only a commit leaves the text as it was, so only it can take on
            // what was typed meanwhile; a switch replaces the text under it.
            show(
              result.opened,
              keepsText ? snapshot : undefined,
              switchedPosition
            );
            setCommitError(null);
          }
          return true;
        } finally {
          busy.current = false;
          lifecycle.schedule();
        }
      })();
      inflight.current = task;
      const clear = () => {
        inflight.current = null;
        setCommandRunning(false);
      };
      task.then(clear, clear);
      return task;
    },
    [barrier, enabled, latest, lifecycle, show, status, recovery]
  );

  /** Saves the typing as new versions. True if there is nothing left unsaved. */
  const commit = useCallback(
    () => run((document) => session.commit(document), true),
    [run, session]
  );
  const switchTo = useCallback(
    (action: BufferSwitchAction) =>
      run(
        (document) => session.switchTo(document, action),
        false,
        action.position
      ),
    [run, session]
  );
  const dismissRecovery = useCallback(async () => {
    try {
      await session.dismissRecovery();
      setRecovery(null);
      setCommitError(null);
    } catch (error) {
      setCommitError(error instanceof Error ? error.message : String(error));
    }
  }, [session]);

  const onSelection = useCallback(
    (selection: BufferSelection) => {
      feed.onSelection(selection);
      caretRef.current = selection.start;
      setCaret(selection.start);
    },
    [feed]
  );
  const position = useMemo(
    () => passageIndexAt(doc, caret ?? doc.caret ?? doc.index.length),
    [doc, caret]
  );

  return {
    ...feed,
    onSelection,
    status,
    epoch,
    /** What the pill can offer at the passage holding the caret. */
    choices: choices[position] ?? choices[choices.length - 1],
    commit,
    switchTo,
    /** A failed open or save, as one line for the screen. */
    notice:
      commitError !== null
        ? `Not saved: ${commitError}`
        : status === 'error'
          ? "Couldn't open this buffer"
          : null,
    recovery,
    readOnly: bufferReadOnly({
      enabled,
      status,
      commandRunning,
      recoveryPending: recovery !== null,
    }),
    keepRecovery: () => {
      setCommitError(null);
      setStatus('loading');
      setReload((value) => value + 1);
    },
    dismissRecovery,
  };
};
