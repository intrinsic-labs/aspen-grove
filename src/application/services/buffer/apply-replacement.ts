import {
  type AuthorshipRun,
  alignRunsToClusters,
  replaceInRuns,
} from './authorship-runs';
import {
  type BufferDocument,
  type DocumentIndex,
  type DocumentRange,
  type RangeOwner,
  TAIL_OWNER,
  indexDocument,
  ownerAt,
  ownerRuns,
} from './document-ranges';

/** A replacement of `[start, end)` of the document by `inserted`. */
export type Replacement = {
  readonly start: number;
  readonly end: number;
  readonly inserted: string;
};

export type ApplyResult = {
  readonly index: DocumentIndex;
  /**
   * Who keeps left affinity now: the owner of the edit's start. Pass it back
   * as `hold` for the next edit until the caret is moved on purpose.
   */
  readonly affinity: RangeOwner;
  /** The owners whose text changed, each once, in document order. */
  readonly touched: readonly RangeOwner[];
};

type Placed = Replacement & { readonly order: number };

/** Clamped to the document, in descending offset order. */
const descending = (
  replacements: readonly Replacement[],
  length: number
): Placed[] => {
  const clamp = (value: number) => Math.min(Math.max(value, 0), length);
  const placed = replacements.map((replacement, order) => {
    const start = clamp(replacement.start);
    return {
      start,
      end: Math.max(clamp(replacement.end), start),
      inserted: replacement.inserted,
      order,
    };
  });
  // Insertions at one offset keep their listed order in the text, so the
  // later-listed one is applied first.
  placed.sort((a, b) => b.start - a.start || b.order - a.order);
  placed.forEach((current, i) => {
    const higher = placed[i - 1];
    const sharesStart =
      higher !== undefined &&
      current.start === higher.start &&
      (current.end > current.start || higher.end > higher.start);
    if (higher && (current.end > higher.start || sharesStart)) {
      throw new RangeError(
        `Replacements overlap: [${current.start}, ${current.end}) and ` +
          `[${higher.start}, ${higher.end})`
      );
    }
  });
  return placed;
};

const keyOf = (owner: RangeOwner): string =>
  owner.kind === 'tail' ? 'tail' : `passage:${owner.id}`;

/**
 * Applies one transaction's replacements, all measured against the old
 * layout, in descending offset order so an edit never moves one still to
 * come. Each owner's runs are rewritten as the edits arrive; the document is
 * rebuilt and indexed once at the end.
 *
 * - An edit that spans owners deletes each intersection and inserts once, at
 *   the owner of the selection start.
 * - A fresh insertion at a seam belongs to the right-hand node, at the end of
 *   the document to the tail, unless `hold` keeps left affinity (see
 *   `ownerAt`). `hold` only matters for an empty selection.
 * - Inserted text is the human's at once. Deleted text leaves nothing behind.
 * - Replacement text is never changed. Where an edge falls inside a grapheme
 *   cluster the cluster is recolored human afterwards.
 *
 * Replacements must not overlap (an insertion at the start of a deletion is
 * one replacement, not two, whichever is listed first); overlapping ones throw a RangeError. Offsets
 * outside the document are clamped.
 */
export const applyReplacements = (
  index: DocumentIndex,
  replacements: readonly Replacement[],
  hold?: RangeOwner
): ApplyResult => {
  const working = new Map<string, readonly AuthorshipRun[]>();
  const touched = new Map<string, DocumentRange>();
  const runsOf = (range: DocumentRange): readonly AuthorshipRun[] =>
    working.get(keyOf(range.owner)) ?? ownerRuns(index.document, range.owner);
  const change = (
    range: DocumentRange,
    from: number,
    to: number,
    inserted: string
  ) => {
    working.set(
      keyOf(range.owner),
      replaceInRuns(runsOf(range), from, to, inserted)
    );
    touched.set(keyOf(range.owner), range);
  };

  let affinity: RangeOwner = hold ?? TAIL_OWNER;
  for (const edit of descending(replacements, index.length)) {
    if (edit.start === edit.end && edit.inserted.length === 0) {
      continue;
    }
    const first = ownerAt(
      index,
      edit.start,
      edit.start === edit.end ? hold : undefined
    );
    affinity = first.owner;
    for (const range of index.ranges) {
      const from = Math.max(edit.start, range.start);
      const to = Math.min(edit.end, range.end);
      if (range === first) {
        const local = edit.start - range.start;
        change(range, local, Math.max(local, to - range.start), edit.inserted);
      } else if (from < to) {
        change(range, from - range.start, to - range.start, '');
      }
    }
  }

  const passages = index.document.passages.map((passage) => {
    const runs = working.get(keyOf({ kind: 'passage', id: passage.id }));
    return runs ? { ...passage, runs: alignRunsToClusters(runs) } : passage;
  });
  const tailRuns = working.get(keyOf(TAIL_OWNER));
  const document: BufferDocument = {
    passages,
    tail: tailRuns ? alignRunsToClusters(tailRuns) : index.document.tail,
  };
  return {
    index: indexDocument(document),
    affinity,
    touched: index.ranges
      .map((range) => touched.get(keyOf(range.owner)))
      .filter((range): range is DocumentRange => range !== undefined)
      .map((range) => range.owner),
  };
};
