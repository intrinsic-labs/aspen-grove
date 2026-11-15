import { useCallback } from 'react';
import { confirmDiscardChanges } from './confirm-discard-changes';

/**
 * A sheet's close request (a swipe down, Android's back): it closes at once
 * when nothing is unsaved, and otherwise asks first (`confirm`). Discard
 * Changes drops the edits (`discard`, so the sheet reopens without them),
 * then closes; Keep Editing leaves both alone.
 */
export const useDiscardGuard = (
  hasUnsavedChanges: boolean,
  close: () => void,
  discard: () => void = () => undefined,
  confirm: (discard: () => void) => void = confirmDiscardChanges
) =>
  useCallback(() => {
    if (hasUnsavedChanges) {
      confirm(() => {
        discard();
        close();
      });
    } else {
      close();
    }
  }, [close, confirm, discard, hasUnsavedChanges]);
