/** What the screen knows when something tries to navigate away from it. */
export type LeaveState = {
  /** Typing on screen that is not yet a saved version. */
  readonly dirty: boolean;
  /** A save started by an earlier attempt to leave is still running. */
  readonly saving: boolean;
};

/**
 * - `leave`: let the navigation through (the document is clean).
 * - `save`: hold it, save, then decide again with `afterSave`.
 * - `hold`: hold it and do nothing; a save is already pending and will
 *   release the first navigation once, so a second one is dropped.
 */
export type LeaveDecision = 'leave' | 'save' | 'hold';

export const decideLeave = ({ dirty, saving }: LeaveState): LeaveDecision => {
  if (!dirty) return 'leave';
  return saving ? 'hold' : 'save';
};

/** After the save: go on if it left nothing unsaved, else stay and keep the text. */
export const afterSave = (saved: boolean): 'leave' | 'stay' =>
  saved ? 'leave' : 'stay';
