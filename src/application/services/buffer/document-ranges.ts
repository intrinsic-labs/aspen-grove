import {
  type AuthorshipRun,
  coalesce,
  runsLength,
  runsText,
  sliceRuns,
} from './authorship-runs';

/**
 * The buffer document as the editor sees it: the resolved passages in path
 * order followed by the working tail, indexed by UTF-16 length. UTF-16 code
 * units are what native selection reports, and every range is half-open.
 *
 * A passage is one committed version node. A passage with no text is kept, so
 * a version a user emptied still has a place in the path.
 */
export type Passage = {
  /** The id of the version node this text belongs to. */
  readonly id: string;
  readonly runs: readonly AuthorshipRun[];
};

export type BufferDocument = {
  readonly passages: readonly Passage[];
  /** Text not yet committed to a node. */
  readonly tail: readonly AuthorshipRun[];
};

/** Who owns a stretch of the document: a committed passage or the tail. */
export type RangeOwner =
  { readonly kind: 'passage'; readonly id: string } | { readonly kind: 'tail' };

export const TAIL_OWNER: RangeOwner = { kind: 'tail' };

export const sameOwner = (a: RangeOwner, b: RangeOwner): boolean =>
  a.kind === b.kind && (a.kind === 'tail' || a.id === (b as { id: string }).id);

export type DocumentRange = {
  readonly owner: RangeOwner;
  readonly start: number;
  readonly end: number;
};

export type DocumentIndex = {
  readonly document: BufferDocument;
  /** One range per passage, in order, then the tail's. Contiguous. */
  readonly ranges: readonly DocumentRange[];
  readonly length: number;
};

/** The runs a range's owner holds. */
export const ownerRuns = (
  document: BufferDocument,
  owner: RangeOwner
): readonly AuthorshipRun[] =>
  owner.kind === 'tail'
    ? document.tail
    : (document.passages.find((passage) => passage.id === owner.id)?.runs ??
      []);

export const indexDocument = (document: BufferDocument): DocumentIndex => {
  const ranges: DocumentRange[] = [];
  let at = 0;
  const add = (owner: RangeOwner, runs: readonly AuthorshipRun[]) => {
    const end = at + runsLength(runs);
    ranges.push({ owner, start: at, end });
    at = end;
  };
  for (const passage of document.passages) {
    add({ kind: 'passage', id: passage.id }, passage.runs);
  }
  add(TAIL_OWNER, document.tail);
  return { document, ranges, length: at };
};

export const rangeOf = (
  index: DocumentIndex,
  owner: RangeOwner
): DocumentRange | undefined =>
  index.ranges.find((range) => sameOwner(range.owner, owner));

/**
 * The range that owns `offset`, for an edit that starts there.
 *
 * Inside a passage that is the passage. At a seam the text typed in belongs
 * to the right-hand node, and at the end of the document to the tail: the
 * first range with text that starts at or contains the offset, else the tail.
 *
 * `hold` is left affinity. After the user deletes to a node's new end (even
 * to nothing), the caret stays with that node until it is moved on purpose,
 * so backspace followed by typing lands in the same passage. If the held
 * owner still exists and `offset` is within its range, closed at both ends,
 * it wins over the seam rule. The caller passes `hold` only while the caret
 * has not been moved, and drops it on any explicit caret move.
 */
export const ownerAt = (
  index: DocumentIndex,
  offset: number,
  hold?: RangeOwner
): DocumentRange => {
  const at = Math.min(Math.max(offset, 0), index.length);
  if (hold) {
    const held = rangeOf(index, hold);
    if (held && held.start <= at && at <= held.end) {
      return held;
    }
  }
  return (
    index.ranges.find((range) => range.start <= at && at < range.end) ??
    index.ranges[index.ranges.length - 1]
  );
};

/** The runs covering `[from, to)` of the whole document, coalesced. */
export const sliceDocument = (
  index: DocumentIndex,
  from: number,
  to: number
): readonly AuthorshipRun[] =>
  coalesce(
    index.ranges.flatMap((range) =>
      sliceRuns(
        ownerRuns(index.document, range.owner),
        from - range.start,
        to - range.start
      )
    )
  );

/** The whole text and its author runs: for load, export and prompts. */
export const materialize = (
  index: DocumentIndex
): { readonly text: string; readonly runs: readonly AuthorshipRun[] } => {
  const runs = sliceDocument(index, 0, index.length);
  return { text: runsText(runs), runs };
};
