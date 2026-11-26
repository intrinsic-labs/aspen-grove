import { EditorState, Transaction, type TransactionSpec } from '@codemirror/state';
import { history, isolateHistory, redo, undo } from '@codemirror/commands';
import { modelRanges, modelRangesField } from './model-ranges';
import type { ModelRange } from '../../src/interface/components/buffer/android/web-editor-protocol';

// A pure state test: no view, no DOM. `undo`/`redo` take a state and a dispatch.
const make = (doc: string, ranges: readonly ModelRange[]) => {
  let state = EditorState.create({
    doc,
    extensions: [history(), modelRanges(ranges)],
  });
  const apply = (spec: TransactionSpec) => {
    state = state.update(spec).state;
  };
  const run = (command: typeof undo) =>
    command({ state, dispatch: (tr) => (state = tr.state) });
  return {
    apply,
    undo: () => run(undo),
    redo: () => run(redo),
    get text() {
      return state.doc.toString();
    },
    get ranges() {
      return state.field(modelRangesField);
    },
  };
};

const type = (at: number, insert: string): TransactionSpec => ({
  changes: { from: at, insert },
  userEvent: 'input.type',
  annotations: isolateHistory.of('full'),
});

describe('model ranges and history', () => {
  // "Hello " human, "model text" model (6..16), " end" human.
  const DOC = 'Hello model text end';
  const MODEL: ModelRange[] = [[6, 16]];

  it('restores text and ranges across a typed edit, a paste over a seam, undo and redo', () => {
    const editor = make(DOC, MODEL);

    editor.apply(type(10, 'XY')); // typed inside the model text
    const afterType = { text: editor.text, ranges: editor.ranges };
    expect(afterType.text).toBe('Hello modeXYl text end');
    expect(afterType.ranges).toEqual([
      [6, 10],
      [12, 18],
    ]);

    // Paste over the seam: replaces "o m" (4..7) with "PASTED".
    editor.apply({
      changes: { from: 4, to: 7, insert: 'PASTED' },
      userEvent: 'input.paste',
      annotations: isolateHistory.of('full'),
    });
    const afterPaste = { text: editor.text, ranges: editor.ranges };
    expect(afterPaste.text).toBe('HellPASTEDodeXYl text end');
    expect(afterPaste.ranges).toEqual([
      [10, 13],
      [15, 21],
    ]);

    editor.undo();
    expect({ text: editor.text, ranges: editor.ranges }).toEqual(afterType);
    editor.undo();
    expect(editor.text).toBe(DOC);
    expect(editor.ranges).toEqual(MODEL);

    editor.redo();
    expect({ text: editor.text, ranges: editor.ranges }).toEqual(afterType);
    editor.redo();
    expect({ text: editor.text, ranges: editor.ranges }).toEqual(afterPaste);
  });

  it('brings deleted model text back as model text', () => {
    const editor = make(DOC, MODEL);
    editor.apply({
      changes: { from: 6, to: 16 },
      userEvent: 'delete.selection',
    });
    expect(editor.ranges).toEqual([]);
    editor.undo();
    expect(editor.text).toBe(DOC);
    expect(editor.ranges).toEqual(MODEL);
    editor.redo();
    expect(editor.text).toBe('Hello  end');
    expect(editor.ranges).toEqual([]);
  });

  it('undoes a burst of joined typing as one step, ranges included', () => {
    const editor = make(DOC, MODEL);
    // Same instant, adjacent, input.type: history joins these into one event.
    [10, 11, 12].forEach((at) =>
      editor.apply({
        changes: { from: at, insert: 'z' },
        userEvent: 'input.type',
      })
    );
    expect(editor.text).toBe('Hello modezzzl text end');
    editor.undo();
    expect(editor.text).toBe(DOC);
    expect(editor.ranges).toEqual(MODEL);
    editor.redo();
    expect(editor.text).toBe('Hello modezzzl text end');
    expect(editor.ranges).toEqual([
      [6, 10],
      [13, 19],
    ]);
  });

  it('keeps the loaded colors: a load is not an undo step', () => {
    const editor = make(DOC, MODEL);
    expect(editor.undo()).toBe(false);
    expect(editor.ranges).toEqual(MODEL);
  });

  it('stays out of the way of changes made outside history', () => {
    const editor = make(DOC, MODEL);
    editor.apply({
      changes: { from: 0, insert: '>> ' },
      annotations: Transaction.addToHistory.of(false),
    });
    expect(editor.ranges).toEqual([[9, 19]]);
  });
});
