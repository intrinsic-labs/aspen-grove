import { EditorView, type ViewUpdate } from '@codemirror/view';
import type {
  ChangesMessage,
  CheckpointMessage,
  ModelRange,
  Replacement,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import { breaksField } from './line-separators';
import { modelRangesField } from './model-ranges';
import { restoreSeparators, toHostOffset, type Break } from './separators';

/** Model ranges in the host's units (a CRLF counts two). */
const hostRanges = (
  ranges: readonly ModelRange[],
  breaks: readonly Break[]
): ModelRange[] =>
  ranges.map(([from, to]) => [
    toHostOffset(breaks, from),
    toHostOffset(breaks, to),
  ]);

/**
 * One edit as the host receives it: replacements against the pre-edit text,
 * in the host's units. The page shows every line break as LF; offsets come
 * from the breaks before the edit and inserted text gets its separators back.
 */
export const changesOf = (
  update: ViewUpdate,
  epoch: number,
  prevRevision: number
): ChangesMessage => {
  const replacements: Replacement[] = [];
  const before = update.startState.field(breaksField);
  const after = update.state.field(breaksField);
  update.changes.iterChanges((from, to, fromB, toB, inserted) =>
    replacements.push({
      from: toHostOffset(before, from),
      to: toHostOffset(before, to),
      insert: restoreSeparators(
        inserted.toString(),
        after.map(([p, k]): Break => [p - fromB, k]),
        0,
        toB - fromB
      ),
    })
  );
  const { anchor, head } = update.state.selection.main;
  const restored = update.transactions.some(
    (t) => t.isUserEvent('undo') || t.isUserEvent('redo')
  );
  return {
    type: 'changes',
    epoch,
    prevRevision,
    revision: prevRevision + 1,
    replacements,
    selection: {
      anchor: toHostOffset(after, anchor),
      head: toHostOffset(after, head),
    },
    composing: update.view.composing,
    ...(restored
      ? { modelRanges: hostRanges(update.state.field(modelRangesField), after) }
      : {}),
  };
};

/** The page's whole state, for the host to resume from after a gap. */
export const checkpointOf = (
  view: EditorView,
  epoch: number,
  revision: number,
  seam: number
): CheckpointMessage => {
  const { anchor, head } = view.state.selection.main;
  const breaks = view.state.field(breaksField);
  return {
    type: 'checkpoint',
    epoch,
    revision,
    text: restoreSeparators(view.state.doc.toString(), breaks),
    modelRanges: hostRanges(view.state.field(modelRangesField), breaks),
    seam,
    selection: {
      anchor: toHostOffset(breaks, anchor),
      head: toHostOffset(breaks, head),
    },
    composing: view.composing,
  };
};
