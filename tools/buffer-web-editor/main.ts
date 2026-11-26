import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import type {
  HostMessage,
  LoadMessage,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import { mapSeamThrough } from '../../src/interface/components/buffer/android/web-editor-seam';
import { listen, post } from './bridge';
import { authorMarks } from './marks';
import { changesOf, checkpointOf } from './report';
import { applyStyle } from './theme';

let view: EditorView | undefined;
/** Names the load in progress; host messages for another epoch are dropped. */
let epoch = -1;
/** Edits reported since the load. */
let revision = 0;
/** The latest revision the host has acknowledged (diagnostics only). */
let acknowledged = 0;
/** The end of the shared prefix, carried through every edit (checkpoints). */
let seam = 0;
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
      `AGBUF page epoch=${epoch} rev=${revision} acked=${acknowledged} len=${text.length} head=${head} bursts=${bursts} before=${JSON.stringify(
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

const create = (message: LoadMessage): EditorView =>
  new EditorView({
    parent: document.getElementById('editor') as HTMLElement,
    state: EditorState.create({
      doc: message.text,
      extensions: [
        history(),
        keymap.of(historyKeymap),
        EditorView.lineWrapping,
        authorMarks(message.modelRanges),
        placeholder(message.style.placeholder),
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
            seam = mapSeamThrough(seam, message.replacements);
            revision += 1;
            logSettled(update.view);
          }
        }),
      ],
    }),
  });

/** A fresh editor per load: no history, selection or marks carry over. */
const load = (message: LoadMessage): void => {
  applyStyle(message.style);
  diagnostics = message.style.diagnostics;
  view?.destroy();
  epoch = message.epoch;
  revision = 0;
  acknowledged = 0;
  seam = message.seam;
  view = create(message);
};

const receive = (message: HostMessage): void => {
  if (message.type === 'load') {
    load(message);
  } else if (message.epoch !== epoch || !view) {
    return;
  } else if (message.type === 'ack') {
    acknowledged = Math.max(acknowledged, message.revision);
  } else if (message.type === 'checkpointRequest') {
    post(checkpointOf(view, epoch, revision, seam));
  } else if (message.type === 'endComposition') {
    // Blurring commits the composing text through the IME; the answer follows.
    view.contentDOM.blur();
    reportComposition(view);
  }
};

listen(receive);
post({ type: 'ready' });
