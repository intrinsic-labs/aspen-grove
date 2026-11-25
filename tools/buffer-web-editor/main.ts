import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  placeholder,
  type ViewUpdate,
} from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import {
  type EditorMessage,
  type LoadMessage,
  type Replacement,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import { authorMarks, setModelRanges } from './marks';
import { applyStyle } from './theme';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

const post = (message: EditorMessage): void =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));

let epoch = -1;
let revision = 0;
let diagnostics = false;
let idle: ReturnType<typeof setTimeout> | undefined;

/** One line after typing settles: the page's own count, for the receipts. */
const logSettled = (view: EditorView): void => {
  clearTimeout(idle);
  if (!diagnostics) {
    return;
  }
  idle = setTimeout(() => {
    const { head } = view.state.selection.main;
    const text = view.state.doc.toString();
    const bursts = (text.match(/burst\d\d /g) ?? []).length;
    console.log(
      `AGBUF page epoch=${epoch} rev=${revision} len=${text.length} head=${head} bursts=${bursts} before=${JSON.stringify(
        text.slice(Math.max(0, head - 60), head)
      )}`
    );
  }, 400);
};

const reportChanges = (update: ViewUpdate): void => {
  const replacements: Replacement[] = [];
  update.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
    replacements.push({ from, to, insert: inserted.toString() })
  );
  revision += 1;
  const { anchor, head } = update.state.selection.main;
  post({
    type: 'changes',
    epoch,
    revision,
    replacements,
    selection: { anchor, head },
    composing: update.view.composing,
  });
  logSettled(update.view);
};

const create = (text: string, hint: string): EditorView =>
  new EditorView({
    parent: document.getElementById('editor') as HTMLElement,
    state: EditorState.create({
      doc: text,
      extensions: [
        history(),
        keymap.of(historyKeymap),
        EditorView.lineWrapping,
        authorMarks,
        placeholder(hint),
        EditorView.contentAttributes.of({
          id: 'buffer-document',
          spellcheck: 'true',
          autocorrect: 'on',
          autocapitalize: 'sentences',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            reportChanges(update);
          }
        }),
      ],
    }),
  });

let view: EditorView | undefined;

/** A fresh editor per load: no history, selection or marks carry over. */
const load = (message: LoadMessage): void => {
  applyStyle(message.style);
  diagnostics = message.style.diagnostics;
  view?.destroy();
  epoch = message.epoch;
  revision = 0;
  view = create(message.text, message.style.placeholder);
  view.dispatch({ effects: setModelRanges.of(message.modelRanges) });
};

const receive = (event: Event): void => {
  const data = (event as MessageEvent<unknown>).data;
  if (typeof data !== 'string') {
    return;
  }
  try {
    const message = JSON.parse(data) as LoadMessage;
    if (message.type === 'load') {
      load(message);
    }
  } catch {
    // Malformed host input is dropped; the page keeps its document.
  }
};

// react-native-webview delivers host messages to `document` on Android and
// to `window` on iOS.
document.addEventListener('message', receive);
window.addEventListener('message', receive);
post({ type: 'ready' });
