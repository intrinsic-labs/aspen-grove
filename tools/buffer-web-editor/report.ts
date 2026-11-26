import { EditorView, type ViewUpdate } from '@codemirror/view';
import type {
  ChangesMessage,
  CheckpointMessage,
  Replacement,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import { modelRangesField } from './model-ranges';

/** One edit as the host receives it: replacements against the pre-edit text. */
export const changesOf = (
  update: ViewUpdate,
  epoch: number,
  prevRevision: number
): ChangesMessage => {
  const replacements: Replacement[] = [];
  update.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
    replacements.push({ from, to, insert: inserted.toString() })
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
    selection: { anchor, head },
    composing: update.view.composing,
    ...(restored ? { modelRanges: update.state.field(modelRangesField) } : {}),
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
  return {
    type: 'checkpoint',
    epoch,
    revision,
    text: view.state.doc.toString(),
    modelRanges: view.state.field(modelRangesField),
    seam,
    selection: { anchor, head },
  };
};
