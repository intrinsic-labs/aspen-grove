import { EditorState, Transaction, type Extension } from '@codemirror/state';

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
      !transaction.isUserEvent('select') ||
      // History's own selection undo carries its private annotation; a
      // replacement spec would drop it and break the history stack.
      transaction.isUserEvent('select.undo') ||
      transaction.isUserEvent('select.redo')
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
    const addToHistory = transaction.annotation(Transaction.addToHistory);
    return {
      selection: transaction.selection,
      userEvent: transaction.annotation(Transaction.userEvent),
      scrollIntoView: false,
      ...(addToHistory === undefined
        ? {}
        : { annotations: Transaction.addToHistory.of(addToHistory) }),
    };
  });
