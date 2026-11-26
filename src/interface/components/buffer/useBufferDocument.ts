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
import type {
  CompositionBarrier,
  CompositionControl,
} from './composition-barrier';
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
  enabled: boolean,
  editor: Pick<CompositionControl, 'settle'>,
  webEditor = false
) => {
  const { useCases } = useAppServices();
  const [caret, setCaret] = useState<number>();
  const caretRef = useRef<number | undefined>(undefined);
  const [loadCaret, setLoadCaret] = useState<number>();
  const [switchPosition, setSwitchPosition] = useState<number>();
  const moveCaret = useCallback((offset: number) => {
    caretRef.current = offset;
    setCaret(offset);
    setSwitchPosition(undefined);
  }, []);
  const feed = useBufferEditorFeed(barrier, emptyPreview, moveCaret);
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
  // A command is running (or the document is loading): the draft waits.
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
      const command = snapshot !== undefined || switchedPosition !== undefined;
      const switchedRange =
        switchedPosition === undefined
          ? undefined
          : reloaded.index.ranges[switchedPosition];
      let kept = caretOnReload(caretRef.current, reloaded, switchedPosition);
      if (webEditor) {
        kept = command ? (switchedRange?.start ?? kept ?? 0) : undefined;
      }
      if (!typedSince) setLoadCaret(kept);
      // An empty version shares its start with the next passage.
      setSwitchPosition(webEditor ? switchedPosition : undefined);
      caretRef.current = kept;
      setCaret(kept);
    },
    [barrier, latest, setDoc, webEditor]
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
        try {
          await editor.settle();
        } catch (error) {
          setCommitError(
            error instanceof Error ? error.message : String(error)
          );
          return false;
        }
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
    [barrier, editor, enabled, latest, lifecycle, show, status, recovery]
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
  /** Typing on screen that is not yet a saved version. */
  const document = doc.index.document;
  const dirty = useMemo(
    () => enabled && status === 'ready' && session.isDirty(document),
    // `epoch` follows every reload, which moves what counts as saved.
    [enabled, status, session, document, epoch]
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
      moveCaret(selection.start);
    },
    [feed, moveCaret]
  );
  const position = useMemo(
    () =>
      switchPosition ??
      passageIndexAt(
        doc,
        caret ?? doc.caret ?? (webEditor ? 0 : doc.index.length)
      ),
    [doc, caret, switchPosition, webEditor]
  );

  return {
    ...feed,
    onSelection,
    status,
    epoch,
    loadCaret,
    /** What the pill can offer at the passage holding the caret. */
    choices: choices[position] ?? choices[choices.length - 1],
    commit,
    dirty,
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
