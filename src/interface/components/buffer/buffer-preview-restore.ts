/**
 * What the Android page hands the host that is not a plain edit: exact model
 * ranges restored by undo and redo, and a whole checkpoint after a revision
 * gap. Both end in the same `DocumentIndex` shape the reducer produces, with
 * the passages' text where the reducer put it. Colors only ever come from
 * the page's ranges here; nothing is diffed and nothing goes back to the page.
 */
import type { Replacement } from '@application/services/buffer/apply-replacement';
import {
  type Author,
  type AuthorshipRun,
  coalesce,
  sliceRuns,
} from '@application/services/buffer/authorship-runs';
import {
  type RangeOwner,
  indexDocument,
  ownerRuns,
} from '@application/services/buffer/document-ranges';
import type { OwnerLayout } from '@application/services/buffer/owner-layout';
import type { ModelRange } from './android/web-editor-protocol';
import { type PreviewDocument, applyEdits } from './buffer-preview-document';

/** `text` as author runs: the ranges are the model's, the rest is human. */
export const runsFromRanges = (
  text: string,
  ranges: readonly ModelRange[]
): readonly AuthorshipRun[] => {
  const runs: AuthorshipRun[] = [];
  let at = 0;
  const push = (author: Author, end: number) => {
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
 * Relabels the document's authorship from exact ranges over the whole text.
 * Each owner keeps its text and its place, so a sibling switch still works;
 * only its colors change.
 */
export const relabel = (
  doc: PreviewDocument,
  ranges: readonly ModelRange[]
): PreviewDocument => {
  const { document } = doc.index;
  const runsOfOwner = (owner: RangeOwner, start: number) => {
    const text = ownerRuns(document, owner)
      .map((run) => run.text)
      .join('');
    const local = ranges
      .map(([from, to]) => [from - start, to - start] as const)
      .filter(([, to]) => to > 0)
      .map(([from, to]) => [Math.max(from, 0), to] as const);
    return runsFromRanges(text, local);
  };
  const starts = new Map(
    doc.index.ranges.map((range) => [JSON.stringify(range.owner), range.start])
  );
  const startOf = (owner: RangeOwner) => starts.get(JSON.stringify(owner)) ?? 0;
  return {
    ...doc,
    index: indexDocument({
      passages: document.passages.map((passage) => {
        const owner: RangeOwner = { kind: 'passage', id: passage.id };
        return { ...passage, runs: runsOfOwner(owner, startOf(owner)) };
      }),
      tail: runsOfOwner({ kind: 'tail' }, startOf({ kind: 'tail' })),
    }),
  };
};

/**
 * One accepted page transaction: its replacements in one `applyReplacements`
 * call, then, for undo and redo, the exact colors the page restored. The
 * page's colors are authoritative, so nothing is reconciled here.
 */
export const applyPageChanges = (
  doc: PreviewDocument,
  replacements: readonly Replacement[],
  caret: number,
  modelRanges?: readonly ModelRange[]
): PreviewDocument => {
  const next = applyEdits(doc, replacements, { caret, exactColors: true });
  return modelRanges ? relabel(next, modelRanges) : next;
};

/**
 * Resumes from a page checkpoint. The page tracked the owner boundaries
 * through every edit with the host's own planner (`advanceLayout`), so the
 * text is split where the reducer would have split it: each passage and
 * the tail keep exactly their stretch, however the
 * missed edits changed lengths, and left affinity carries over. The sibling
 * endings not shown stay as they are.
 */
export const adopt = (
  doc: PreviewDocument,
  text: string,
  ranges: readonly ModelRange[],
  layout: OwnerLayout,
  caret?: number
): PreviewDocument => {
  const runs = runsFromRanges(text, ranges);
  const clamp = (value: number | undefined) =>
    Math.min(Math.max(value ?? text.length, 0), text.length);
  let start = 0;
  const passages = doc.index.document.passages.map((passage, i) => {
    const end = Math.max(start, clamp(layout.ends[i]));
    const restored = { ...passage, runs: sliceRuns(runs, start, end) };
    start = end;
    return restored;
  });
  const held = layout.hold === undefined ? undefined : passages[layout.hold];
  return {
    ...doc,
    index: indexDocument({
      passages,
      tail: sliceRuns(runs, start, clamp(layout.ends[passages.length])),
    }),
    hold:
      layout.hold === undefined
        ? undefined
        : held
          ? { kind: 'passage', id: held.id }
          : { kind: 'tail' },
    caret,
    drift: undefined,
  };
};
