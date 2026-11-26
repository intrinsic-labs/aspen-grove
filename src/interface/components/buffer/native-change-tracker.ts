import type { Replacement } from '@application/services/buffer/apply-replacement';
import { type BufferSelection, deriveReplacement } from './derive-replacement';

/**
 * Turns the native input's change events into replacements, each against the
 * string the native view held just before it.
 *
 * Native text events can outrun React: a fast typist (or a test driver) can
 * deliver several changes before the parent has rendered the first. Each edit
 * is applied by the parent to its latest state, so it must be measured from
 * the previous native string, not from the last rendered one, or the second
 * change re-reports the first and its text lands twice. So the tracker
 * advances its baseline as it receives, remembers the strings the parent has
 * not rendered yet, and treats `sync` as a confirmation: a rendered string it
 * issued retires the older ones; any other rendered string is a change of the
 * document from outside (a sibling switch) and becomes the new baseline.
 *
 * This also drops iOS's habit of delivering the same change twice: an event
 * equal to the baseline is no change.
 */
export type ChangeTracker = {
  /** The text that was replaced when `rendered` is a change from outside, else null. */
  readonly sync: (rendered: string) => string | null;
  readonly receive: (
    next: string,
    selection: BufferSelection | null
  ) => Replacement | null;
};

export const createChangeTracker = (initial: string): ChangeTracker => {
  let baseline = initial;
  let pending: string[] = [];
  return {
    sync: (rendered) => {
      const at = pending.indexOf(rendered);
      if (at >= 0) {
        pending = pending.slice(at + 1);
        return null;
      }
      if (rendered === baseline) {
        return null;
      }
      const replaced = baseline;
      baseline = rendered;
      pending = [];
      return replaced;
    },
    receive: (next, selection) => {
      if (next === baseline) {
        return null;
      }
      const edit = deriveReplacement(baseline, next, selection);
      baseline = next;
      pending.push(next);
      return edit;
    },
  };
};
