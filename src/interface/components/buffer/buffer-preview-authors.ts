import {
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
 * Resumes from a page checkpoint. The page tracked the seam through every
 * edit it made, so the text is split there: what is before it is the shared
 * prefix, what is after it is the current ending. Neither side can absorb
 * the other's text, however the missed edits changed lengths on either side.
 * The sibling endings not shown stay as they are.
 */
export const adoptCheckpoint = (
  state: PreviewState,
  text: string,
  ranges: readonly ModelRange[],
  seam: number
): PreviewState => {
  const runs = runsFromRanges(text, ranges);
  const at = Math.min(Math.max(seam, 0), text.length);
  return {
    ...state,
    prefix: sliceRuns(runs, 0, at),
    suffixes: state.suffixes.map((suffix, i) =>
      i === state.index ? sliceRuns(runs, at, Number.POSITIVE_INFINITY) : suffix
    ),
  };
};
