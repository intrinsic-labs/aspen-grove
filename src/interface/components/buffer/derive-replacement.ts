import type { PreviewEdit } from './buffer-preview';
import { isClusterBoundary } from '../../../application/services/buffer/text-boundaries';

export type BufferSelection = { readonly start: number; readonly end: number };

const rawReplacement = (
  previous: string,
  next: string,
  selection: BufferSelection | null
): PreviewEdit | null => {
  if (previous === next) {
    return null;
  }
  if (selection) {
    const { start, end } = selection;
    if (start <= end && end <= previous.length) {
      const insertedLength = next.length - (previous.length - (end - start));
      if (insertedLength >= 0) {
        const inserted = next.slice(start, start + insertedLength);
        if (
          previous.slice(0, start) + inserted + previous.slice(end) ===
          next
        ) {
          return { start, end, inserted };
        }
      }
      const removed = previous.length - next.length;
      if (start === end && removed > 0) {
        for (const from of [start - removed, start]) {
          if (
            from >= 0 &&
            from + removed <= previous.length &&
            previous.slice(0, from) + previous.slice(from + removed) === next
          ) {
            return { start: from, end: from + removed, inserted: '' };
          }
        }
      }
    }
  }
  return diffReplacement(previous, next);
};

/** The smallest single replacement turning `previous` into `next`. */
const diffReplacement = (previous: string, next: string): PreviewEdit => {
  let prefix = 0;
  const shortest = Math.min(previous.length, next.length);
  while (prefix < shortest && previous[prefix] === next[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    start: prefix,
    end: previous.length - suffix,
    inserted: next.slice(prefix, next.length - suffix),
  };
};

/**
 * Widens an edit to whole clusters, so no run edge can fall inside a
 * surrogate pair or a base-plus-mark cluster: an accent swapped in place
 * rewrites its base letter too, and the cluster takes one author.
 */
const widenToClusters = (
  previous: string,
  next: string,
  edit: PreviewEdit
): PreviewEdit => {
  let { start, end } = edit;
  let nextEnd = start + edit.inserted.length;
  while (
    start > 0 &&
    !(isClusterBoundary(previous, start) && isClusterBoundary(next, start))
  ) {
    start -= 1;
  }
  while (
    end < previous.length &&
    nextEnd < next.length &&
    !(isClusterBoundary(previous, end) && isClusterBoundary(next, nextEnd))
  ) {
    end += 1;
    nextEnd += 1;
  }
  return { start, end, inserted: next.slice(start, nextEnd) };
};

/**
 * What changed between the last string the editor accepted and the string
 * the keyboard produced, as one replacement of `[start, end)`; null when
 * nothing changed.
 *
 * The caret disambiguates repeated text ("aaa" to "aaaa"): the edit is
 * taken to be where the selection was, whether a typed character, a
 * replaced selection, backspace or forward delete. An autocorrect that
 * rewrites more than the selection matches none of those, so it falls back
 * to the longest common prefix and suffix.
 *
 * The result is widened to whole clusters (see `widenToClusters`).
 */
/**
 * What changed between the last string the editor accepted and the string
 * the keyboard produced, as one replacement of `[start, end)`; null when
 * nothing changed.
 *
 * The caret disambiguates repeated text ("aaa" to "aaaa"): the edit is
 * taken to be where the selection was, whether a typed character, a
 * replaced selection, backspace or forward delete. An autocorrect that
 * rewrites more than the selection matches none of those, so it falls back
 * to the longest common prefix and suffix. Whatever the route, the result
 * is widened to whole clusters so no run edge splits a surrogate pair or a
 * letter from its accent, and replacing the edit's range in `previous`
 * always gives exactly `next`.
 */
export const deriveReplacement = (
  previous: string,
  next: string,
  selection: BufferSelection | null
): PreviewEdit | null => {
  const edit = rawReplacement(previous, next, selection);
  return edit ? widenToClusters(previous, next, edit) : null;
};
