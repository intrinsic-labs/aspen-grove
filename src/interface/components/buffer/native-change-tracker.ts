import type { PreviewEdit } from './buffer-preview';
import { type BufferSelection, deriveReplacement } from './derive-replacement';

/**
 * Turns the native input's change events into replacements against the last
 * string the editor accepted.
 *
 * `sync` is called with the accepted document on every render; `receive`
 * with each native string. iOS can deliver the same change twice before
 * React renders (the first character into an empty input does), and
 * applying it twice would double the character, so a string already handled
 * since the last accepted document is dropped.
 */
export type ChangeTracker = {
  readonly sync: (accepted: string) => void;
  readonly receive: (
    next: string,
    selection: BufferSelection | null
  ) => PreviewEdit | null;
};

export const createChangeTracker = (initial: string): ChangeTracker => {
  let accepted = initial;
  let handled = initial;
  return {
    sync: (text) => {
      if (accepted !== text) {
        accepted = text;
        handled = text;
      }
    },
    receive: (next, selection) => {
      if (next === handled) {
        return null;
      }
      handled = next;
      return deriveReplacement(accepted, next, selection);
    },
  };
};
