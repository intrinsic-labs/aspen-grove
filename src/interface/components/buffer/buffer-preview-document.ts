/**
 * The buffer editor's preview state, on the production reducer. The document
 * is a shared prefix and the selected sibling ending as passages, plus the
 * working tail, indexed by UTF-16 length (`DocumentIndex`). Every edit goes
 * through `applyReplacements`; the screen renders `materialize(index)`.
 * Nothing is persisted here: Phase 4 gives the passages real node ids.
 *
 * Left affinity (`hold`) belongs to a caret that has not moved. An edit keeps
 * it only when it starts or ends where the last edit left the caret
 * (`keepsHold`), and a selection event that is not our own edit drops it
 * (`noteSelection`), so it holds whichever order the platform delivers its
 * selection and change events in.
 */
import {
  applyReplacements,
  type Replacement,
} from '@application/services/buffer/apply-replacement';
import {
  type AuthorshipRun,
  coalesce,
} from '@application/services/buffer/authorship-runs';
import {
  type DocumentIndex,
  type RangeOwner,
  indexDocument,
  materialize,
  rangeOf,
} from '@application/services/buffer/document-ranges';
import { keepsHold } from '@application/services/buffer/owner-layout';
import { recordEdit } from './buffer-preview-reconcile';

export const PREFIX_ID = 'prefix';
export const endingId = (position: number): string => `ending:${position}`;

export type PreviewDocument = {
  readonly index: DocumentIndex;
  /**
   * The sibling endings. The selected one's live text is the passage in
   * `index`; its entry here is what it was when last switched away from.
   */
  readonly endings: readonly (readonly AuthorshipRun[])[];
  readonly selected: number;
  /** The owner that keeps left affinity until the caret moves. */
  readonly hold?: RangeOwner;
  /** Where our last edit left the caret, in UTF-16 units. */
  readonly caret?: number;
  /** A selection event away from `caret` that no edit has explained yet. */
  readonly drift?: number;
  /** What each passage descends from: the model text its colors reconcile to. */
  readonly ancestors: Readonly<Record<string, readonly AuthorshipRun[]>>;
  /** Bumped on every change to a passage; results for older ones are stale. */
  readonly revisions: Readonly<Record<string, number>>;
  /** The last few texts of each passage with an ancestor, for undo. */
  readonly history: Readonly<Record<string, readonly string[]>>;
  /** The last reconciled colors of each passage, and the revision they were for. */
  readonly reconciled: Readonly<
    Record<
      string,
      { readonly revision: number; readonly runs: readonly AuthorshipRun[] }
    >
  >;
  /** Passages to reconcile once the composition in progress ends. */
  readonly pending: readonly string[];
};

export type PreviewParts = {
  readonly prefix: readonly AuthorshipRun[];
  readonly endings: readonly (readonly AuthorshipRun[])[];
  readonly selected?: number;
  /** Model text each ending descends from, by position; none for the prefix. */
  readonly ancestors?: readonly (readonly AuthorshipRun[] | undefined)[];
};

const passagesOf = (
  prefix: readonly AuthorshipRun[],
  selected: number,
  ending: readonly AuthorshipRun[]
) => [
  { id: PREFIX_ID, runs: prefix },
  { id: endingId(selected), runs: ending },
];

export const previewDocument = ({
  prefix,
  endings,
  selected = 0,
  ancestors = [],
}: PreviewParts): PreviewDocument => {
  const at = Math.min(Math.max(selected, 0), Math.max(endings.length - 1, 0));
  return {
    index: indexDocument({
      passages: passagesOf(prefix, at, endings[at] ?? []),
      tail: [],
    }),
    endings,
    selected: at,
    ancestors: Object.fromEntries(
      ancestors.flatMap((runs, position) =>
        runs ? [[endingId(position), runs] as const] : []
      )
    ),
    revisions: {},
    history: {},
    reconciled: {},
    pending: [],
  };
};

/** What an empty buffer holds: nothing, and nothing to switch between. */
export const emptyPreview = (): PreviewDocument =>
  previewDocument({ prefix: [], endings: [[]] });

export const documentText = (doc: PreviewDocument): string =>
  materialize(doc.index).text;

export const documentRuns = (doc: PreviewDocument): readonly AuthorshipRun[] =>
  materialize(doc.index).runs;

export const siblingCount = (doc: PreviewDocument): number =>
  doc.endings.length;

/** The owners' end offsets, prefix first and the tail last. */
export const documentEnds = (doc: PreviewDocument): number[] =>
  doc.index.ranges.map((range) => range.end);

/** The caret an edit leaves behind: after the last replacement's text. */
export const caretAfter = (replacements: readonly Replacement[]): number => {
  const ordered = [...replacements].sort((a, b) => a.start - b.start);
  let shift = 0;
  let caret = 0;
  for (const edit of ordered) {
    caret = edit.start + shift + edit.inserted.length;
    shift += edit.inserted.length - (edit.end - edit.start);
  }
  return caret;
};

export type EditOptions = {
  /** Where the caret is afterwards, when the platform says so. */
  readonly caret?: number;
  /** An IME composition is open: recoloring waits for it to end. */
  readonly composing?: boolean;
  /**
   * The page already carries exact colors (Android), so a restored string
   * is not reconciled against its ancestor here.
   */
  readonly exactColors?: boolean;
};

/** One transaction of replacements against the document's current layout. */
export const applyEdits = (
  doc: PreviewDocument,
  replacements: readonly Replacement[],
  options: EditOptions = {}
): PreviewDocument => {
  const hold = keepsHold(doc.caret, replacements) ? doc.hold : undefined;
  const result = applyReplacements(doc.index, replacements, hold);
  const edited: PreviewDocument = {
    ...doc,
    index: result.index,
    hold: result.touched.length === 0 ? hold : result.affinity,
    caret: options.caret ?? caretAfter(replacements),
    drift: undefined,
  };
  return recordEdit(doc, edited, result.touched, options);
};

/**
 * A selection change reported by the native input. It is our own edit's
 * caret when it lands where the last edit left it. Anything else is the user
 * moving it, even if an edit is about to follow (the event can arrive first):
 * the first such event is only noted, because the edit it precedes explains
 * it, and a second one, or one back at the old caret, proves a move.
 */
export const noteSelection = (
  doc: PreviewDocument,
  selection: { readonly start: number; readonly end: number }
): PreviewDocument => {
  if (doc.hold === undefined) {
    return doc;
  }
  if (selection.start === selection.end) {
    const at = selection.start;
    if (doc.drift === undefined) {
      return at === doc.caret ? doc : { ...doc, drift: at };
    }
    if (at === doc.drift) {
      return doc;
    }
  }
  return { ...doc, hold: undefined, drift: undefined };
};

/**
 * Switches to another ending; the prefix, and any edit to it, stays. Text
 * typed at the end belongs to the ending it followed, so it joins that
 * ending first.
 */
export const selectSibling = (
  doc: PreviewDocument,
  position: number
): PreviewDocument => {
  const target = Math.min(Math.max(position, 0), doc.endings.length - 1);
  if (target === doc.selected) {
    return doc;
  }
  const { document } = doc.index;
  const leaving = coalesce([
    ...(document.passages[1]?.runs ?? []),
    ...document.tail,
  ]);
  const endings = doc.endings.map((runs, at) =>
    at === doc.selected ? leaving : runs
  );
  const next = previewDocument({
    prefix: document.passages[0]?.runs ?? [],
    endings,
    selected: target,
  });
  return {
    ...next,
    ancestors: doc.ancestors,
    revisions: doc.revisions,
    history: doc.history,
    reconciled: doc.reconciled,
    pending: doc.pending,
  };
};

/** Where the shared prefix ends: the seam the sibling pill swaps at. */
export const prefixLength = (doc: PreviewDocument): number =>
  rangeOf(doc.index, { kind: 'passage', id: PREFIX_ID })?.end ?? 0;
