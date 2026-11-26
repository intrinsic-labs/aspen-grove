import { describe, expect, it } from '@jest/globals';
import {
  applyEdits,
  documentRuns,
  documentText,
  type PreviewDocument,
  selectSibling,
} from './buffer-preview-document';
import { observeComposition } from './buffer-preview-composition';
import { samplePreview } from './buffer-preview-sample';
import { createCompositionBarrier } from './composition-barrier';
import { createChangeTracker } from './native-change-tracker';

describe('ending a composition with a sibling switch queued', () => {
  it('recolors the departing passage before the switch', () => {
    let doc: PreviewDocument = samplePreview();
    const colors = documentRuns(doc).map((run) => [run.author, run.text]);
    const original = documentText(doc);
    const tracker = createChangeTracker(original);
    const gone = 'quiet under it,';
    const at = original.indexOf('quiet');
    // Delete, then undo while composing: the recolor is held back.
    for (const [text, start, end, composing] of [
      [original.replace(gone, ''), at, at + gone.length, false],
      [original, at + gone.length, at + gone.length, true],
    ] as const) {
      const edit = tracker.receive(text, { start, end });
      if (edit) {
        doc = applyEdits(doc, [edit], { composing });
      }
      tracker.sync(documentText(doc));
    }
    expect(doc.pending.length).toBe(1);

    // The same queue the hook feeds: each update runs on the latest document.
    const apply = (update: (d: PreviewDocument) => PreviewDocument) => {
      doc = update(doc);
    };
    const barrier = createCompositionBarrier({
      requestEnd: () => undefined,
      setTimer: () => 0,
      clearTimer: () => undefined,
    });
    barrier.observe(true);
    barrier.run(() => apply((d) => selectSibling(d, 1)));

    observeComposition(barrier, apply, false);
    expect(doc.selected).toBe(1);
    // Back on the first ending, its colors are the recolored ones.
    doc = selectSibling(doc, 0);
    expect(documentRuns(doc).map((run) => [run.author, run.text])).toEqual(
      colors
    );
  });
});
