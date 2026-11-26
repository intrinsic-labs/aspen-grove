/**
 * Recoloring a passage from its ancestor, for the native engine. Text the
 * keyboard restores (iOS undo and redo hand back a whole earlier string, with
 * no colors) comes back colored by what it still shares with the model text
 * it descends from (`reconcileRuns`), not as new human typing.
 *
 * The signal is the string itself: an edit whose result equals one of the
 * passage's recent texts is a restoration. Results are cached by passage and
 * revision, a result for an older revision is dropped, and a composition in
 * progress holds the recoloring back until it ends. Recoloring changes colors
 * only, never the text, and the host never writes it back to the input.
 */
import { reconcileRuns } from '@application/services/buffer/ancestor-authorship';
import {
  type AuthorshipRun,
  runsText,
} from '@application/services/buffer/authorship-runs';
import {
  type RangeOwner,
  indexDocument,
  ownerRuns,
} from '@application/services/buffer/document-ranges';
import type { EditOptions, PreviewDocument } from './buffer-preview-document';

/** How many earlier texts of a passage count as "restored" when they return. */
const HISTORY_LENGTH = 24;

const sameRuns = (
  a: readonly AuthorshipRun[],
  b: readonly AuthorshipRun[]
): boolean =>
  a.length === b.length &&
  a.every((run, i) => run.author === b[i].author && run.text === b[i].text);

const passageIdOf = (owner: RangeOwner): string | undefined =>
  owner.kind === 'passage' ? owner.id : undefined;

/** The document with one passage's runs replaced; the text must be the same. */
const withPassageRuns = (
  doc: PreviewDocument,
  id: string,
  runs: readonly AuthorshipRun[]
): PreviewDocument => {
  const { document } = doc.index;
  const current = document.passages.find((passage) => passage.id === id);
  if (!current || sameRuns(current.runs, runs)) {
    return doc;
  }
  return {
    ...doc,
    index: indexDocument({
      ...document,
      passages: document.passages.map((passage) =>
        passage.id === id ? { ...passage, runs } : passage
      ),
    }),
  };
};

/** The passage's colors from its ancestor, once per revision. */
const reconcilePassage = (
  doc: PreviewDocument,
  id: string
): { doc: PreviewDocument; runs: readonly AuthorshipRun[] } | null => {
  const ancestor = doc.ancestors[id];
  const passage = doc.index.document.passages.find((p) => p.id === id);
  if (!ancestor || !passage) {
    return null;
  }
  const revision = doc.revisions[id] ?? 0;
  const cached = doc.reconciled[id];
  if (cached?.revision === revision) {
    return { doc, runs: cached.runs };
  }
  const runs = reconcileRuns(ancestor, runsText(passage.runs));
  return {
    doc: {
      ...doc,
      reconciled: { ...doc.reconciled, [id]: { revision, runs } },
    },
    runs,
  };
};

/**
 * Recolors `id` with a result computed for `revision`; a result for a
 * passage that has changed since is dropped.
 */
export const applyReconciled = (
  doc: PreviewDocument,
  id: string,
  revision: number,
  runs: readonly AuthorshipRun[]
): PreviewDocument =>
  (doc.revisions[id] ?? 0) === revision && runsText(runs) === textOf(doc, id)
    ? withPassageRuns(doc, id, runs)
    : doc;

const textOf = (doc: PreviewDocument, id: string): string =>
  runsText(
    doc.index.document.passages.find((passage) => passage.id === id)?.runs ?? []
  );

const recolor = (doc: PreviewDocument, id: string): PreviewDocument => {
  const result = reconcilePassage(doc, id);
  return result
    ? applyReconciled(result.doc, id, doc.revisions[id] ?? 0, result.runs)
    : doc;
};

/**
 * Bookkeeping after an edit: bumps the revision of each passage it touched,
 * remembers the text it had, and recolors one that went back to an earlier
 * text. `edited` is the document with the edit applied; `before` is without.
 */
export const recordEdit = (
  before: PreviewDocument,
  edited: PreviewDocument,
  touched: readonly RangeOwner[],
  options: EditOptions
): PreviewDocument => {
  let doc = edited;
  for (const id of touched.flatMap((owner) => passageIdOf(owner) ?? [])) {
    doc = {
      ...doc,
      revisions: { ...doc.revisions, [id]: (doc.revisions[id] ?? 0) + 1 },
    };
    if (!doc.ancestors[id] || options.exactColors) {
      continue;
    }
    const previous = runsText(
      ownerRuns(before.index.document, { kind: 'passage', id })
    );
    const now = textOf(doc, id);
    const seen = doc.history[id] ?? [];
    const restored = now !== previous && seen.includes(now);
    doc = {
      ...doc,
      history: {
        ...doc.history,
        [id]: [previous, ...seen.filter((text) => text !== previous)].slice(
          0,
          HISTORY_LENGTH
        ),
      },
    };
    if (restored) {
      doc = options.composing
        ? { ...doc, pending: [...new Set([...doc.pending, id])] }
        : recolor(doc, id);
    }
  }
  return doc;
};

/** A composition ended: recolor what it held back, if still present. */
export const flushReconcile = (doc: PreviewDocument): PreviewDocument =>
  doc.pending.length === 0
    ? doc
    : doc.pending.reduce(recolor, { ...doc, pending: [] });
