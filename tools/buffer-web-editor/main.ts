import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import type {
  HostMessage,
  LoadMessage,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
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
        EditorView.contentAttributes.of({
          id: 'buffer-document',
          spellcheck: 'true',
          autocorrect: 'on',
          autocapitalize: 'sentences',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            post(changesOf(update, epoch, revision));
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
    post(checkpointOf(view, epoch, revision));
  }
};

listen(receive);
post({ type: 'ready' });
