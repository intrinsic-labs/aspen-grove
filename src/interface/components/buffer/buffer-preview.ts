/**
 * The buffer editor's review fixture and its in-memory edit model. Nothing
 * here is persisted: it lets the editor, its authorship colors and the
 * sibling switch be seen and tried before any tree row is written.
 *
 * A document is a shared prefix plus one of several alternative endings (the
 * siblings). All offsets are UTF-16 code units, the unit native selection
 * reports. Phase 2 replaces this with the production edit reducer; run
 * slicing and coalescing already live with it, in the application layer.
 */
import {
  type Author,
  type AuthorshipRun,
  coalesce,
  runsLength,
  sliceRuns,
} from '../../../application/services/buffer/authorship-runs';

export type PreviewAuthor = Author;

export type PreviewRun = AuthorshipRun;

export type PreviewState = {
  readonly prefix: readonly PreviewRun[];
  /** Alternative endings after the prefix: the siblings. */
  readonly suffixes: readonly (readonly PreviewRun[])[];
  readonly index: number;
};

/** A replacement of `[start, end)` of the document by `inserted`. */
export type PreviewEdit = {
  readonly start: number;
  readonly end: number;
  readonly inserted: string;
};

const human = (text: string): PreviewRun => ({ author: 'human', text });
const model = (text: string): PreviewRun => ({ author: 'model', text });

/** What an empty buffer holds: nothing, and nothing to switch between. */
export const emptyPreview = (): PreviewState => ({
  prefix: [],
  suffixes: [[]],
  index: 0,
});

/**
 * A human opening, two model endings that differ, and, in the first, a
 * human word typed inside a model sentence.
 */
export const samplePreview = (): PreviewState => ({
  prefix: [human('The snow had been falling since dawn. ')],
  suffixes: [
    [
      model(
        'By evening the whole town lay quiet under it, and the lamps along the '
      ),
      human('old'),
      model(' harbour came on one by one, soft and yellow.'),
    ],
    [
      model(
        'Nobody went out. The kettles sang in every kitchen, and the children ' +
          'pressed their faces to the glass, waiting for the world to begin again.'
      ),
    ],
  ],
  index: 0,
});

export { coalesce, runsLength, sliceRuns };

/** Replaces `[start, end)` in `runs`; the inserted text is the human's. */
const replaceRuns = (
  runs: readonly PreviewRun[],
  start: number,
  end: number,
  inserted: string
): readonly PreviewRun[] =>
  coalesce([
    ...sliceRuns(runs, 0, start),
    ...(inserted.length > 0 ? [human(inserted)] : []),
    ...sliceRuns(runs, end, Number.POSITIVE_INFINITY),
  ]);

const currentSuffix = (state: PreviewState): readonly PreviewRun[] =>
  state.suffixes[state.index] ?? [];

/** The visible document as contiguous author runs. */
export const previewRuns = (state: PreviewState): readonly PreviewRun[] =>
  coalesce([...state.prefix, ...currentSuffix(state)]);

export const previewText = (state: PreviewState): string =>
  previewRuns(state)
    .map((run) => run.text)
    .join('');

export const siblingCount = (state: PreviewState): number =>
  state.suffixes.length;

/**
 * Applies a native edit. It lands in the prefix when it lies wholly before
 * the seam, in the current ending when it starts at or after it (so a fresh
 * insertion at the seam belongs to the right-hand side), and when it
 * crosses the seam the inserted text belongs to the prefix, the owner of the
 * selection start. Text typed in is always the human's.
 */
export const applyPreviewEdit = (
  state: PreviewState,
  edit: PreviewEdit
): PreviewState => {
  const seam = runsLength(state.prefix);
  const total = seam + runsLength(currentSuffix(state));
  const start = Math.min(Math.max(edit.start, 0), total);
  const end = Math.min(Math.max(edit.end, start), total);
  const { inserted } = edit;

  const withSuffix = (suffix: readonly PreviewRun[]) => ({
    ...state,
    suffixes: state.suffixes.map((existing, i) =>
      i === state.index ? suffix : existing
    ),
  });

  if (start >= seam) {
    return withSuffix(
      replaceRuns(currentSuffix(state), start - seam, end - seam, inserted)
    );
  }
  if (end <= seam) {
    return {
      ...state,
      prefix: replaceRuns(state.prefix, start, end, inserted),
    };
  }
  return {
    ...withSuffix(
      sliceRuns(currentSuffix(state), end - seam, Number.POSITIVE_INFINITY)
    ),
    prefix: replaceRuns(state.prefix, start, seam, inserted),
  };
};

/** Switches to another ending; the prefix, and any edit to it, stays. */
export const selectPreviewSibling = (
  state: PreviewState,
  index: number
): PreviewState => ({
  ...state,
  index: Math.min(Math.max(index, 0), state.suffixes.length - 1),
});
