import { EditorState } from '@codemirror/state';
import { history, redoSelection, undoSelection } from '@codemirror/commands';
import { keepViewportOnSelectAll } from './select-all';

const open = (): EditorState =>
  EditorState.create({
    doc: 'one\ntwo\nthree',
    selection: { anchor: 4 },
    extensions: [keepViewportOnSelectAll()],
  });

describe('select-all keeps the viewport', () => {
  it('drops the scroll request of a whole-document selection', () => {
    const transaction = open().update({
      selection: { anchor: 13, head: 0 },
      userEvent: 'select',
      scrollIntoView: true,
    });
    expect(transaction.scrollIntoView).toBe(false);
    expect(transaction.state.selection.main.from).toBe(0);
    expect(transaction.state.selection.main.to).toBe(13);
    expect(transaction.isUserEvent('select')).toBe(true);
  });

  it('leaves a caret or partial selection following the head', () => {
    const state = open();
    expect(
      state.update({
        selection: { anchor: 4, head: 9 },
        userEvent: 'select',
        scrollIntoView: true,
      }).scrollIntoView
    ).toBe(true);
  });

  it('leaves typing alone', () => {
    expect(
      open().update({
        changes: { from: 0, insert: 'x' },
        scrollIntoView: true,
        userEvent: 'input.type',
      }).scrollIntoView
    ).toBe(true);
  });

  it('selection undo and redo through a whole-document selection still work', () => {
    let state = EditorState.create({
      doc: 'one\ntwo\nthree',
      selection: { anchor: 4 },
      extensions: [history(), keepViewportOnSelectAll()],
    });
    const run = (command: typeof undoSelection) =>
      command({
        state,
        dispatch: (transaction) => {
          state = transaction.state;
        },
      });
    state = state.update({
      selection: { anchor: 13, head: 0 },
      userEvent: 'select',
      scrollIntoView: true,
    }).state;
    state = state.update({
      selection: { anchor: 2 },
      userEvent: 'select',
    }).state;

    expect(run(undoSelection)).toBe(true);
    expect(state.selection.main.from).toBe(0);
    expect(state.selection.main.to).toBe(13);
    expect(run(undoSelection)).toBe(true);
    expect(state.selection.main.head).toBe(4);
    expect(run(redoSelection)).toBe(true);
    expect(state.selection.main.to).toBe(13);
    expect(run(redoSelection)).toBe(true);
    expect(state.selection.main.head).toBe(2);
  });
});
