import { reconcileWithAncestor } from '@application/services/buffer/ancestor-authorship';
import {
  type AuthorshipRun,
  coalesce,
} from '@application/services/buffer/authorship-runs';
import {
  indexDocument,
  ownerAt,
} from '@application/services/buffer/document-ranges';
import type { OpenedPassage } from '@application/use-cases/OpenBufferDocumentUseCase';
import {
  applyEdits,
  documentText,
  type PreviewDocument,
} from './buffer-preview-document';
import { deriveReplacement } from './derive-replacement';

/** The colors of one stored passage: its author, or its edit of model text. */
const runsOfPassage = (passage: OpenedPassage): readonly AuthorshipRun[] => {
  if (passage.author === 'model')
    return coalesce([{ author: 'model', text: passage.text }]);
  return passage.ancestorText === undefined
    ? coalesce([{ author: 'human', text: passage.text }])
    : reconcileWithAncestor(passage.ancestorText, passage.text);
};

/**
 * The document the reducer edits, built from a buffer's real passages:
 * `Passage.id` is the node id, model nodes are model runs, human nodes human
 * runs, and an edit of model text is colored against that model text. Every
 * model passage also descends from its own text, so edits to it recolor
 * (and an undo restores colors) as in the sample. Nothing is in the tail.
 */
export const previewFromPassages = (
  passages: readonly OpenedPassage[]
): PreviewDocument => ({
  index: indexDocument({
    passages: passages.map((passage) => ({
      id: passage.nodeId,
      runs: runsOfPassage(passage),
    })),
    tail: [],
  }),
  endings: [[]],
  selected: 0,
  ancestors: Object.fromEntries(
    passages.flatMap((passage) => {
      const ancestor =
        passage.author === 'model' ? passage.text : passage.ancestorText;
      return ancestor
        ? [[passage.nodeId, [{ author: 'model', text: ancestor }]] as const]
        : [];
    })
  ),
  revisions: {},
  history: {},
  reconciled: {},
  pending: [],
});

/** The index of the passage a caret offset belongs to; the tail counts as the last. */
export const passageIndexAt = (
  doc: PreviewDocument,
  offset: number
): number => {
  const { passages } = doc.index.document;
  const owner = ownerAt(doc.index, offset).owner;
  const index =
    owner.kind === 'tail'
      ? passages.length - 1
      : passages.findIndex((passage) => passage.id === owner.id);
  return Math.max(index, 0);
};

/**
 * Typing that arrived after a snapshot was taken, on top of the document
 * reloaded from it: one replacement from the snapshot's text to what is on
 * screen now. The reloaded text is the snapshot's text exactly.
 */
export const rebaseTyping = (
  reloaded: PreviewDocument,
  snapshot: PreviewDocument,
  current: PreviewDocument
): PreviewDocument => {
  if (current.index.document === snapshot.index.document) return reloaded;
  const edit = deriveReplacement(
    documentText(snapshot),
    documentText(current),
    null
  );
  return edit ? applyEdits(reloaded, [edit]) : reloaded;
};

/**
 * Where the caret is after the document is reloaded, so the pill stays on
 * the passage it was switching. A commit leaves the text as it was, so the
 * offset stays. A switch replaces the passage at `position`: the offset is
 * kept inside that passage's new text. (Ending at its last character keeps
 * it clear of the seam, where the right-hand passage would own it.)
 */
export const caretOnReload = (
  offset: number | undefined,
  reloaded: PreviewDocument,
  position?: number
): number | undefined => {
  if (offset === undefined) return undefined;
  const length = reloaded.index.length;
  if (position === undefined) return Math.min(offset, length);
  const range = reloaded.index.ranges[position];
  if (!range) return Math.min(offset, length);
  const last = Math.max(range.start, range.end - 1);
  return Math.min(Math.max(offset, range.start), last);
};
