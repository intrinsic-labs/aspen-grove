import { EditorState, type Extension } from '@codemirror/state';

/**
 * Android's select-all arrives as a DOM selection change that CodeMirror
 * turns into a `select` transaction with `scrollIntoView`, and the selection's
 * head is the start of the document, so the view jumped to the top. Native
 * select-all leaves the viewport where it is. A selection of the whole
 * document, from a selection that was not, no longer asks for a scroll.
 */
export const keepViewportOnSelectAll = (): Extension =>
  EditorState.transactionFilter.of((transaction) => {
    if (
      !transaction.scrollIntoView ||
      transaction.docChanged ||
      !transaction.selection ||
      !transaction.isUserEvent('select')
    ) {
      return transaction;
    }
    const { length } = transaction.startState.doc;
    const covers = (state: EditorState): boolean => {
      const { from, to } = state.selection.main;
      return length > 0 && from === 0 && to === length;
    };
    if (!covers(transaction.state) || covers(transaction.startState)) {
      return transaction;
    }
    return {
      selection: transaction.selection,
      userEvent: 'select',
      scrollIntoView: false,
    };
  });
