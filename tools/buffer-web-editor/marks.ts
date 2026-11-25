import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import {
  mapModelRangesThrough,
  type ModelRange,
  type Replacement,
} from '../../src/interface/components/buffer/android/web-editor-protocol';

const modelMark = Decoration.mark({ class: 'ag-model' });

/** Replaces every model range (a document load). */
export const setModelRanges = StateEffect.define<readonly ModelRange[]>();

const decorationsOf = (ranges: readonly ModelRange[]): DecorationSet =>
  Decoration.set(
    ranges.map(([from, to]) => modelMark.range(from, to)),
    true
  );

/**
 * Model-authored ranges, kept as plain offsets so they map through edits by
 * the same rule as the host (text typed inside a model range is human).
 */
const modelRanges = StateField.define<readonly ModelRange[]>({
  create: () => [],
  update(ranges, transaction) {
    let next = ranges;
    for (const effect of transaction.effects) {
      if (effect.is(setModelRanges)) {
        next = effect.value;
      }
    }
    if (!transaction.docChanged) {
      return next;
    }
    const replacements: Replacement[] = [];
    transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
      replacements.push({ from, to, insert: inserted.toString() })
    );
    return mapModelRangesThrough(next, replacements);
  },
  provide: (field) =>
    EditorView.decorations.from(field, (ranges) => decorationsOf(ranges)),
});

export const authorMarks: Extension = modelRanges;
