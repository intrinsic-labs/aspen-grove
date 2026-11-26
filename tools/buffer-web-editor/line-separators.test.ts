import { EditorState, type Transaction } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { history, isolateHistory, undo } from '@codemirror/commands';
import { lineSeparators, breaksField } from './line-separators';
import { modelRanges } from './model-ranges';
import { changesOf, checkpointOf } from './report';
import { restoreSeparators, splitSeparators } from './separators';

/** The brief's sample: LF, a blank line, two CRLFs; 32 UTF-16 units. */
const SAMPLE = 'AA\tBB\n\nCC \u{1F469}‍\u{1F469}‍\u{1F467} é DD\r\nEE\r\nFF';

const open = (raw: string, ranges: [number, number][] = []): EditorState => {
  const { text, breaks } = splitSeparators(raw);
  return EditorState.create({
    doc: text,
    extensions: [history(), lineSeparators(breaks), modelRanges(ranges)],
  });
};

const updateOf = (before: EditorState, transaction: Transaction): ViewUpdate =>
  ({
    startState: before,
    state: transaction.state,
    changes: transaction.changes,
    transactions: [transaction],
    view: { composing: false },
  }) as unknown as ViewUpdate;

/** What CodeMirror's paste does: the input filter, then one user-event transaction. */
const paste = (before: EditorState, raw: string): Transaction => {
  let text = raw;
  for (const filter of before.facet(EditorView.clipboardInputFilter)) {
    text = filter(text, before);
  }
  return before.update(before.replaceSelection(text), {
    userEvent: 'input.paste',
  });
};

const host = (state: EditorState): string =>
  restoreSeparators(state.doc.toString(), state.field(breaksField));

const copy = (state: EditorState): string =>
  state
    .facet(EditorView.clipboardOutputFilter)
    .reduce(
      (text, filter) => filter(text, state),
      state.sliceDoc(state.selection.main.from, state.selection.main.to)
    );

describe('CRLF through the page', () => {
  it('a mixed paste reaches the host as the raw 32 units', () => {
    const start = open('');
    const transaction = paste(start, SAMPLE);
    const message = changesOf(updateOf(start, transaction), 1, 0);

    expect(SAMPLE).toHaveLength(32);
    expect(JSON.stringify(message.replacements)).toBe(
      JSON.stringify([{ from: 0, to: 0, insert: SAMPLE }])
    );
    expect(message.selection).toEqual({ anchor: 32, head: 32 });
    expect(transaction.state.doc.length).toBe(30);
    expect(host(transaction.state)).toBe(SAMPLE);
  });

  it('an edit after the paste is in host units and keeps later separators', () => {
    const pasted = paste(open(''), SAMPLE).state;
    // Insert "x" after "EE" (page offset 25, host 27).
    const at = pasted.doc.toString().indexOf('EE') + 2;
    const edit = pasted.update({ changes: { from: at, insert: 'x' } });
    const message = changesOf(updateOf(pasted, edit), 1, 1);

    expect(message.replacements).toEqual([
      { from: at + 1, to: at + 1, insert: 'x' },
    ]);
    expect(host(edit.state)).toBe(SAMPLE.replace('EE', 'EEx'));
  });

  it('typing Enter is an LF and replacing across a CRLF spans both units', () => {
    const pasted = paste(open(''), SAMPLE).state;
    const crlf = pasted.doc.toString().indexOf('DD') + 2; // the page's "\n"
    const enter = pasted.update({ changes: { from: 0, insert: '\n' } });
    expect(
      changesOf(updateOf(pasted, enter), 1, 1).replacements[0].insert
    ).toBe('\n');

    const cut = pasted.update({ changes: { from: crlf - 1, to: crlf + 2 } });
    expect(changesOf(updateOf(pasted, cut), 1, 1).replacements).toEqual([
      { from: crlf - 1 + 0, to: crlf + 2 + 1, insert: '' },
    ]);
    expect(host(cut.state)).toBe(SAMPLE.replace('DD\r\nEE', 'D' + 'E'));
  });

  it('copy puts the separators back', () => {
    const pasted = paste(open(''), SAMPLE).state;
    const selected = pasted.update({
      selection: { anchor: 0, head: pasted.doc.length },
    }).state;
    expect(copy(selected)).toBe(SAMPLE);
  });

  it('undoing the deletion of a CRLF brings back a CRLF', () => {
    const start = paste(open(''), 'a\r\nb').state;
    const deleted = start.update({
      changes: { from: 1, to: 2 },
      userEvent: 'delete',
      annotations: isolateHistory.of('full'),
    }).state;
    expect(host(deleted)).toBe('ab');

    let restored = deleted;
    undo({ state: deleted, dispatch: (t) => (restored = t.state) });
    expect(host(restored)).toBe('a\r\nb');
  });

  it('opens host text with CRLF: ranges and checkpoint in host units', () => {
    const raw = 'ab\r\ncd\r\nef';
    const state = open(raw, [[3, 6]]); // page cd + LF, host cd + CRLF
    const view = { state, composing: false } as unknown as EditorView;
    const checkpoint = checkpointOf(view, 1, 0, 3);

    expect(checkpoint.text).toBe(raw);
    expect(checkpoint.modelRanges).toEqual([[4, 8]]);
    expect(state.doc.toString()).toBe('ab\ncd\nef');
  });

  it('a drag-move inside the page keeps its CRLF', () => {
    const start = open('AB\r\nCD|XY');
    // CodeMirror's drop: the dragged text leaves through the output filter and
    // comes back through the input filter, then one deletion plus one insertion.
    const raw = copy(start.update({ selection: { anchor: 0, head: 5 } }).state);
    let text = raw;
    for (const filter of start.facet(EditorView.clipboardInputFilter)) {
      text = filter(text, start);
    }
    const moved = start.update({
      changes: [
        { from: 0, to: 5 },
        { from: 8, insert: text },
      ],
      userEvent: 'move.drop',
    });

    expect(raw).toBe('AB\r\nCD');
    expect(host(moved.state)).toBe('|XYAB\r\nCD');
  });
});
