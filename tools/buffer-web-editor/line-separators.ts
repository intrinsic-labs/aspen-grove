import {
  EditorState,
  StateEffect,
  StateField,
  type Transaction,
  type Extension,
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { invertedEffects } from '@codemirror/commands';
import {
  mapBreaks,
  restoreSeparators,
  splitSeparators,
  withBreaks,
  type Break,
} from './separators';

/** States the breaks outright (undo and redo restore them this way). */
const setBreaks = StateEffect.define<readonly Break[]>();
/** Breaks a paste brings, at their positions in the document after it. */
const addBreaks = StateEffect.define<readonly Break[]>();

/**
 * The separators that were not LF, in page positions. They map through edits
 * (a deleted line break takes its entry with it) and are registered with
 * history, so undoing the deletion of a CRLF brings back a CRLF.
 */
export const breaksField = StateField.define<readonly Break[]>({
  create: () => [],
  update(breaks, transaction) {
    let stated: readonly Break[] | undefined;
    let added: readonly Break[] = [];
    for (const effect of transaction.effects) {
      if (effect.is(setBreaks)) {
        stated = effect.value;
      } else if (effect.is(addBreaks)) {
        added = effect.value;
      }
    }
    if (stated) {
      return stated;
    }
    let mapped = breaks;
    if (transaction.docChanged) {
      const changes: [number, number, number][] = [];
      transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
        changes.push([from, to, inserted.length])
      );
      // Pre-edit positions throughout: last change first keeps them valid.
      mapped = changes
        .reverse()
        .reduce(
          (current, [from, to, length]) => mapBreaks(current, from, to, length),
          [...breaks]
        );
    }
    return withBreaks(mapped, added);
  },
});

const NORMALIZE = /\r\n?/g;

/**
 * Pasted text is read before CodeMirror splits it, which is the last moment
 * its separators exist. The transaction that follows takes them as `addBreaks`.
 */
let pastedRaw: string | undefined;

const rememberPaste = (text: string): string => {
  pastedRaw = text.includes('\r') ? text : undefined;
  return pastedRaw === undefined ? text : text.replace(NORMALIZE, '\n');
};

/** A paste's breaks at their positions after it, for a one-change transaction. */
const pasteBreaks = (transaction: Transaction): Break[] => {
  const raw = pastedRaw;
  pastedRaw = undefined;
  if (raw === undefined) {
    return [];
  }
  const inserts: [number, string][] = [];
  transaction.changes.iterChanges((_from, _to, fromB, _toB, inserted) =>
    inserts.push([fromB, inserted.toString()])
  );
  if (inserts.length !== 1 || inserts[0][1] !== raw.replace(NORMALIZE, '\n')) {
    return [];
  }
  const [start] = inserts[0];
  return splitSeparators(raw).breaks.map(([position, kind]): Break => [
    start + position,
    kind,
  ]);
};

/**
 * Keeps raw separators across the page. A paste's separators are recorded;
 * copy and cut put them back, so text leaves as it came in.
 */
export const lineSeparators = (initial: readonly Break[]): Extension => [
  breaksField.init(() => initial),
  invertedEffects.of((transaction) =>
    transaction.docChanged
      ? [setBreaks.of(transaction.startState.field(breaksField))]
      : []
  ),
  EditorView.clipboardInputFilter.of(rememberPaste),
  EditorState.transactionExtender.of((transaction) => {
    if (!transaction.docChanged) {
      return null;
    }
    const brought = pasteBreaks(transaction);
    return brought.length > 0 ? { effects: addBreaks.of(brought) } : null;
  }),
  EditorView.clipboardOutputFilter.of((text, state) => {
    const { ranges } = state.selection;
    if (ranges.length !== 1 || ranges[0].empty) {
      return text;
    }
    const { from, to } = ranges[0];
    return restoreSeparators(
      state.doc.sliceString(from, to),
      state
        .field(breaksField)
        .map(([position, kind]): Break => [position - from, kind]),
      0,
      to - from
    );
  }),
];
