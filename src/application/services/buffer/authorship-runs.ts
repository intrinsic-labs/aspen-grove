import {
  clusterEndAtOrAfter,
  clusterStartAtOrBefore,
  isClusterBoundary,
  splitGraphemes,
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

/** Beyond this many table cells the diff falls back to common ends only. */
const MAX_DIFF_CELLS = 2_000_000;

const commonPrefix = (a: readonly string[], b: readonly string[]): number => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) {
    n += 1;
  }
  return n;
};

/** For each grapheme of `current`, whether it is matched to the ancestor. */
const matchGraphemes = (
  ancestor: readonly string[],
  current: readonly string[]
): boolean[] => {
  const matched = current.map(() => false);
  const head = commonPrefix(ancestor, current);
  matched.fill(true, 0, head);
  const a = ancestor.slice(head);
  const b = current.slice(head);
  const rows = a.length + 1;
  const cols = b.length + 1;
  if (a.length === 0 || b.length === 0) {
    return matched;
  }
  if (rows * cols > MAX_DIFF_CELLS) {
    let tail = 0;
    while (
      tail < Math.min(a.length, b.length) &&
      a[a.length - 1 - tail] === b[b.length - 1 - tail]
    ) {
      tail += 1;
    }
    matched.fill(true, current.length - tail);
    return matched;
  }
  // lcs[i * cols + j] is the longest common subsequence of a[i..] and b[j..].
  const lcs = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * cols + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * cols + j + 1] + 1
          : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      matched[head + j] = true;
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return matched;
};

/**
 * The authorship of a passage that descends from model text: what still
 * matches the earliest model ancestor is the model's, everything else is the
 * human's. The diff works on grapheme clusters, so no cluster is split.
 *
 * It is deterministic and leftmost: equal prefixes match first, and where the
 * ancestor's text could match in several places the earliest place in the
 * current text wins. Only the common prefix is trimmed, never the suffix,
 * because trimming the suffix would prefer the rightmost match on a tie.
 */
export const reconcileWithAncestor = (
  ancestorText: string,
  currentText: string
): readonly AuthorshipRun[] => {
  const current = splitGraphemes(currentText);
  const matched = matchGraphemes(splitGraphemes(ancestorText), current);
  return coalesce(
    current.map((text, index) => ({
      author: matched[index] ? 'model' : 'human',
      text,
    }))
  );
};
