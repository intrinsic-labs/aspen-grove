import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import type { ModelRange } from '../../src/interface/components/buffer/android/web-editor-protocol';
import { modelRanges, modelRangesField } from './model-ranges';

const modelMark = Decoration.mark({ class: 'ag-model' });

const decorationsOf = (ranges: readonly ModelRange[]): DecorationSet =>
  Decoration.set(
    ranges.map(([from, to]) => modelMark.range(from, to)),
    true
  );

/** Author colors: model ranges drawn from the history-aware range field. */
export const authorMarks = (initial: readonly ModelRange[]): Extension => [
  modelRanges(initial),
  EditorView.decorations.from(modelRangesField, decorationsOf),
];
