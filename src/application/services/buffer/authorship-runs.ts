import {
  clusterEndAtOrAfter,
  clusterStartAtOrBefore,
  isClusterBoundary,
} from './text-boundaries';

/**
 * Who wrote a stretch of the document. Runs are presentation only: they never
 * enter the graph, and they carry no identity beyond their author. The node a
 * run lives in is the owner (see `document-ranges.ts`).
 */
export type Author = 'human' | 'model';

export type AuthorshipRun = {
  readonly author: Author;
  readonly text: string;
};

const human = (text: string): AuthorshipRun => ({ author: 'human', text });

export const runsLength = (runs: readonly AuthorshipRun[]): number =>
  runs.reduce((total, run) => total + run.text.length, 0);

export const runsText = (runs: readonly AuthorshipRun[]): string =>
  runs.map((run) => run.text).join('');

/** Adjacent runs by one author become one; empty runs vanish. */
export const coalesce = (
  runs: readonly AuthorshipRun[]
): readonly AuthorshipRun[] =>
  runs.reduce<AuthorshipRun[]>((merged, run) => {
    if (run.text.length === 0) {
      return merged;
    }
    const last = merged[merged.length - 1];
    if (last && last.author === run.author) {
      merged[merged.length - 1] = {
        author: last.author,
        text: last.text + run.text,
      };
    } else {
      merged.push(run);
    }
    return merged;
  }, []);

/** The runs covering `[from, to)`, clipped to it. */
export const sliceRuns = (
  runs: readonly AuthorshipRun[],
  from: number,
  to: number
): AuthorshipRun[] => {
  const out: AuthorshipRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const runStart = offset;
    offset += run.text.length;
    const start = Math.max(from, runStart);
    const end = Math.min(to, offset);
    if (start < end) {
      out.push({
        author: run.author,
        text: run.text.slice(start - runStart, end - runStart),
      });
    }
  }
  return out;
};

/**
 * Replaces `[start, end)` of `runs` by `inserted`, which is the human's the
 * moment it is typed. Deleted text leaves nothing behind, so no empty or
 * model-colored remnant survives a deletion.
 */
export const replaceInRuns = (
  runs: readonly AuthorshipRun[],
  start: number,
  end: number,
  inserted: string
): readonly AuthorshipRun[] =>
  coalesce([
    ...sliceRuns(runs, 0, start),
    human(inserted),
    ...sliceRuns(runs, end, Number.POSITIVE_INFINITY),
  ]);

/** Gives `[from, to)` to the human, leaving the rest as it was. */
const humanize = (
  runs: readonly AuthorshipRun[],
  spans: readonly (readonly [number, number])[]
): readonly AuthorshipRun[] => {
  const text = runsText(runs);
  const pieces: AuthorshipRun[] = [];
  let at = 0;
  for (const [from, to] of spans) {
    if (from < at) {
      continue; // an earlier span already covered this cluster
    }
    pieces.push(...sliceRuns(runs, at, from), human(text.slice(from, to)));
    at = to;
  }
  pieces.push(...sliceRuns(runs, at, Number.POSITIVE_INFINITY));
  return coalesce(pieces);
};

/**
 * Makes every cluster of the passage one author's. Only run edges are
 * checked: an edge inside a cluster (a mark typed after a model letter, an
 * emoji swapped for one sharing its high surrogate) gives the whole cluster
 * to the human, who touched it. The text is never changed, only its colors.
 * A cluster split across two passages cannot be repaired here; each passage
 * is a separate node.
 */
export const alignRunsToClusters = (
  runs: readonly AuthorshipRun[]
): readonly AuthorshipRun[] => {
  if (runs.length < 2) {
    return runs;
  }
  const text = runsText(runs);
  const spans: [number, number][] = [];
  let edge = 0;
  for (const run of runs.slice(0, -1)) {
    edge += run.text.length;
    if (!isClusterBoundary(text, edge)) {
      spans.push([
        clusterStartAtOrBefore(text, edge),
        clusterEndAtOrAfter(text, edge),
      ]);
    }
  }
  return spans.length === 0 ? runs : humanize(runs, spans);
};
