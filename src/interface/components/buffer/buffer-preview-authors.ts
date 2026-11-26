import {
  applyPreviewEdit,
  coalesce,
  previewText,
  runsLength,
  sliceRuns,
  type PreviewAuthor,
  type PreviewRun,
  type PreviewState,
} from './buffer-preview';
import type { ModelRange } from './android/web-editor-protocol';

/** `text` as author runs: the ranges are the model's, the rest is human. */
export const runsFromRanges = (
  text: string,
  ranges: readonly ModelRange[]
): readonly PreviewRun[] => {
  const runs: PreviewRun[] = [];
  let at = 0;
  const push = (author: PreviewAuthor, end: number) => {
    if (end > at) {
      runs.push({ author, text: text.slice(at, end) });
      at = end;
    }
  };
  for (const [from, to] of ranges) {
    push('human', Math.min(from, text.length));
    push('model', Math.min(to, text.length));
  }
  push('human', text.length);
  return coalesce(runs);
};

/**
 * Relabels the visible document's authorship from exact ranges, keeping the
 * sibling structure: the seam stays where it is, so a sibling switch still
 * works. Used when the page restores text through undo or redo.
 */
export const relabelPreview = (
  state: PreviewState,
  ranges: readonly ModelRange[]
): PreviewState => {
  const runs = runsFromRanges(previewText(state), ranges);
  const seam = runsLength(state.prefix);
  return {
    ...state,
    prefix: sliceRuns(runs, 0, seam),
    suffixes: state.suffixes.map((suffix, i) =>
      i === state.index
        ? sliceRuns(runs, seam, Number.POSITIVE_INFINITY)
        : suffix
    ),
  };
};

/**
 * Resumes from a page checkpoint: one edit turns the host's text into the
 * page's (the common prefix and suffix are kept), then the page's authorship
 * is applied. Sibling structure survives because this is an ordinary edit.
 */
export const adoptCheckpoint = (
  state: PreviewState,
  text: string,
  ranges: readonly ModelRange[]
): PreviewState => {
  const before = previewText(state);
  let head = 0;
  const limit = Math.min(before.length, text.length);
  while (head < limit && before[head] === text[head]) {
    head += 1;
  }
  let tail = 0;
  while (
    tail < limit - head &&
    before[before.length - 1 - tail] === text[text.length - 1 - tail]
  ) {
    tail += 1;
  }
  const edited =
    before === text
      ? state
      : applyPreviewEdit(state, {
          start: head,
          end: before.length - tail,
          inserted: text.slice(head, text.length - tail),
        });
  return relabelPreview(edited, ranges);
};
