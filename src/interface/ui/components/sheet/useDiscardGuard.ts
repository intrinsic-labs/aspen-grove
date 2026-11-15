import { useCallback } from 'react';
import { confirmDiscardChanges } from './confirm-discard-changes';

/**
 * A sheet's close request (a swipe down, Android's back): it closes at once
 * when nothing is unsaved, and otherwise asks first (`confirm`), closing
 * only if the edits are discarded.
 */
export const useDiscardGuard = (
  hasUnsavedChanges: boolean,
  close: () => void,
  confirm: (discard: () => void) => void = confirmDiscardChanges
) =>
  useCallback(() => {
    if (hasUnsavedChanges) {
      confirm(close);
    } else {
      close();
    }
  }, [close, confirm, hasUnsavedChanges]);
