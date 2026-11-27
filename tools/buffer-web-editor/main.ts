import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import {
  type HostMessage,
  type LoadMessage,
  type SettleMessage,
  toReplacements,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import {
  type OwnerLayout,
  advanceLayout,
  movesCaret,
  releaseHold,
} from '../../src/application/services/buffer/owner-layout';
import { listen, post } from './bridge';
import { authorMarks } from './marks';
import { breaksField, lineSeparators } from './line-separators';
import { keepViewportOnSelectAll } from './select-all';
import { changesOf, checkpointOf } from './report';
import {
  restoreSeparators,
  splitSeparators,
  toHostOffset,
  toPageOffset,
} from './separators';
import { settleComposition } from './settle-composition';
import { applyStyle } from './theme';

const editability = new Compartment();
const editorAccess = (readOnly: boolean) => [
  EditorState.readOnly.of(readOnly),
  EditorView.editable.of(!readOnly),
];

const presentation = new Compartment();
const editorPresentation = (style: LoadMessage['style']) => [
  placeholder(style.placeholder),
  EditorView.scrollMargins.of(() => ({ top: style.paddingTop })),
];

let view: EditorView | undefined;
/** Names the load in progress; host messages for another epoch are dropped. */
let epoch = -1;
/** Edits reported since the load. */
let revision = 0;
/** The latest revision the host has acknowledged (diagnostics only). */
let acknowledged = 0;
/**
 * Where each owner of the document ends and who keeps left affinity, carried
 * through every edit with the host's own planner (checkpoints).
 */
let layout: OwnerLayout = { ends: [0] };
let diagnostics = false;
let idle: ReturnType<typeof setTimeout> | undefined;

/** One line after typing settles: the page's own count, for the receipts. */
const logSettled = (editor: EditorView): void => {
  clearTimeout(idle);
  if (!diagnostics) {
    return;
  }
  idle = setTimeout(() => {
    const { head } = editor.state.selection.main;
    const text = editor.state.doc.toString();
    const bursts = (text.match(/burst\d\d /g) ?? []).length;
    console.log(
      `AGBUF page epoch=${epoch} rev=${revision} acked=${acknowledged} len=${text.length} hostlen=${restoreSeparators(text, editor.state.field(breaksField)).length} head=${head} bursts=${bursts} before=${JSON.stringify(
        text.slice(Math.max(0, head - 60), head)
      )}`
    );
  }, 400);
};

/** Settles a moment after a composition ends, so CodeMirror's own final edit goes out first. */
const COMPOSITION_SETTLE_MS = 150;

/** Tells the host whether a composition is active; an edit says so itself, this covers the end. */
const reportComposition = (editor: EditorView): void => {
  setTimeout(() => {
    if (view === editor) {
      post({ type: 'composition', epoch, composing: editor.composing });
    }
  }, COMPOSITION_SETTLE_MS);
};

const create = (message: LoadMessage): EditorView => {
  // The page shows LF only; the host's separators ride in the break map.
  const { text, breaks } = splitSeparators(message.text);
  const modelRanges = message.modelRanges.map(
    ([from, to]) =>
      [toPageOffset(breaks, from), toPageOffset(breaks, to)] as const
  );
  const caret = toPageOffset(
    breaks,
    Math.max(0, Math.min(message.caret ?? 0, message.text.length))
  );
  return new EditorView({
    scrollTo: EditorView.scrollIntoView(
      caret,
      message.caret === undefined
        ? { y: 'start', yMargin: message.style.paddingTop }
        : { y: 'nearest', yMargin: message.style.paddingTop }
    ),
    parent: document.getElementById('editor') as HTMLElement,
    state: EditorState.create({
      doc: text,
      selection: { anchor: caret },
      extensions: [
        editability.of(editorAccess(message.readOnly)),
        history(),
        keymap.of(historyKeymap),
        EditorView.lineWrapping,
        lineSeparators(breaks),
        keepViewportOnSelectAll(),
        authorMarks(modelRanges),
        presentation.of(editorPresentation(message.style)),
        EditorView.domEventObservers({
          compositionend: (_event, editor) => reportComposition(editor),
        }),
        EditorView.contentAttributes.of({
          id: 'buffer-document',
          'aria-label': 'Document',
          spellcheck: 'true',
          autocorrect: 'on',
          autocapitalize: 'sentences',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const message = changesOf(update, epoch, revision);
            post(message);
            layout = advanceLayout(
              layout,
              toReplacements(message.replacements),
              message.selection.head
            );
            revision += 1;
            logSettled(update.view);
          } else if (
            update.selectionSet &&
            !update.state.selection.eq(update.startState.selection)
          ) {
            const { anchor, head } = update.state.selection.main;
            const breaks = update.state.field(breaksField);
            const selection = {
              anchor: toHostOffset(breaks, anchor),
              head: toHostOffset(breaks, head),
            };
            // A caret the user moved drops affinity here, and the host follows.
            const released = movesCaret(layout, selection);
            if (released) layout = releaseHold(layout);
            post({ type: 'selection', epoch, selection, released });
          }
        }),
      ],
    }),
  });
};

/** A fresh editor per load: no history, selection or marks carry over. */
const load = (message: LoadMessage): void => {
  applyStyle(message.style);
  diagnostics = message.style.diagnostics;
  // A reload must not take the keyboard down: the new editor keeps the focus.
  const hadFocus = view?.hasFocus ?? false;
  const scrollTop =
    message.caret === undefined ? 0 : (view?.scrollDOM.scrollTop ?? 0);
  pendingLock = undefined;
  view?.destroy();
  epoch = message.epoch;
  revision = 0;
  acknowledged = 0;
  layout = { ends: message.ends };
  view = create(message);
  view.scrollDOM.scrollTop = scrollTop;
  if (hadFocus) {
    view.focus();
  }
};

/** Reconfigures presentation only: document, selection, history and IME stay put. */
const setStyle = (editor: EditorView, style: LoadMessage['style']): void => {
  applyStyle(style);
  diagnostics = style.diagnostics;
  editor.dispatch({
    effects: presentation.reconfigure(editorPresentation(style)),
  });
};

// CodeMirror drains pending DOM mutations before its scheduled measurement.
// The update listener posts each resulting transaction synchronously.
const flush = (editor: EditorView) =>
  new Promise<void>((resolve) =>
    editor.requestMeasure({ read: () => resolve() })
  );

const endComposition = (editor: EditorView) => {
  const hadFocus = editor.hasFocus;
  editor.contentDOM.blur();
  if (hadFocus) editor.focus();
  reportComposition(editor);
};

// Both host messages share the lock so either may arrive first during an IME edit.
let pendingLock: Promise<boolean> | undefined;
const setReadOnly = (
  editor: EditorView,
  readOnly: boolean
): Promise<boolean> => {
  const configure = (locked: boolean) =>
    editor.dispatch({
      effects: editability.reconfigure(editorAccess(locked)),
    });
  if (!readOnly) {
    pendingLock = undefined;
    if (editor.state.readOnly) configure(false);
    return Promise.resolve(false);
  }
  if (pendingLock) return pendingLock;
  // The operation can be superseded by an unlock or a new document.
  const current = (): boolean => view === editor && pendingLock === lock;
  const lock: Promise<boolean> = Promise.resolve()
    .then(() =>
      settleComposition({
        current,
        composing: () => editor.compositionStarted,
        end: () => endComposition(editor),
        flush: () => flush(editor),
        lock: async () => {
          if (editor.state.readOnly) return;
          await flush(editor);
          if (current() && !editor.compositionStarted) configure(true);
        },
      })
    )
    .finally(() => {
      if (current()) pendingLock = undefined;
    });
  pendingLock = lock;
  return lock;
};

const settlePage = async (editor: EditorView, request: SettleMessage) => {
  const settled = await setReadOnly(editor, true);
  if (settled && view === editor && editor.state.readOnly) {
    post({ type: 'settled', epoch, requestId: request.requestId, revision });
  }
};

const receive = (message: HostMessage): void => {
  if (message.type === 'load') {
    load(message);
  } else if (message.type === 'style') {
    if (view) setStyle(view, message.style);
  } else if (message.epoch !== epoch || !view) {
    return;
  } else if (message.type === 'readOnly') {
    void setReadOnly(view, message.readOnly);
  } else if (message.type === 'settle') {
    void settlePage(view, message);
  } else if (message.type === 'ack') {
    acknowledged = Math.max(acknowledged, message.revision);
  } else if (message.type === 'checkpointRequest') {
    post(checkpointOf(view, epoch, revision, layout));
  } else if (message.type === 'endComposition') {
    // Blurring commits the composing text through the IME; focusing again
    // keeps the keyboard up and the caret where it was. The answer follows.
    endComposition(view);
  }
};

listen(receive);
post({ type: 'ready' });
