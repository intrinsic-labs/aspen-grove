import { describe, expect, it } from '@jest/globals';
import {
  applyEdits,
  documentRuns,
  documentText,
  endingId,
  type PreviewDocument,
} from './buffer-preview-document';
import { applyReconciled, flushReconcile } from './buffer-preview-reconcile';
import { samplePreview } from './buffer-preview-sample';
import { createChangeTracker } from './native-change-tracker';
import type { BufferSelection } from './derive-replacement';

/** The native input and its parent, as in the stress suite, on the adapter. */
const editor = (initial: PreviewDocument) => {
  let doc = initial;
  const tracker = createChangeTracker(documentText(doc));
  return {
    get doc() {
      return doc;
    },
    get text() {
      return documentText(doc);
    },
    get runs() {
      return documentRuns(doc).map((run) => [run.author, run.text]);
    },
    native(next: string, selection: BufferSelection, composing = false) {
      const edit = tracker.receive(next, selection);
      if (edit) {
        doc = applyEdits(doc, [edit], { composing });
      }
      tracker.sync(documentText(doc));
    },
    flush() {
      doc = flushReconcile(doc);
      tracker.sync(documentText(doc));
    },
  };
};

const caret = (at: number): BufferSelection => ({ start: at, end: at });

describe('native undo restores the previous string and colors', () => {
  it('after deleting model text, undo brings its blue back', () => {
    const e = editor(samplePreview());
    const original = e.text;
    const before = e.runs;
    const at = original.indexOf('quiet');
    // Select "quiet under it," and delete it.
    const gone = 'quiet under it,';
    e.native(original.replace(gone, ''), { start: at, end: at + gone.length });
    expect(e.text).toBe(original.replace(gone, ''));
    // Native undo returns the exact string; the keyboard hands back no colors.
    e.native(original, caret(at + gone.length));
    expect(e.text).toBe(original);
    expect(e.runs).toEqual(before);
  });

  it('after overtyping a model word, undo restores the word and the colors', () => {
    const e = editor(samplePreview());
    const original = e.text;
    const before = e.runs;
    e.native(original, caret(0));
    e.native(original.replace('lay quiet', 'lay hushed'), {
      start: original.indexOf('quiet'),
      end: original.indexOf('quiet') + 5,
    });
    expect(e.runs).not.toEqual(before);
    e.native(original, caret(original.indexOf('quiet') + 6));
    expect(e.runs).toEqual(before);
  });

  it('typing new text is the human’s and is not recolored', () => {
    const e = editor(samplePreview());
    const at = e.text.indexOf('quiet') + 3;
    e.native(e.text.slice(0, at) + 'ZZ' + e.text.slice(at), caret(at));
    expect(
      e.runs.some(([author, text]) => author === 'human' && text === 'ZZ')
    ).toBe(true);
  });

  it('a passage with no model ancestor is left alone by an undo', () => {
    const e = editor(samplePreview());
    const original = e.text;
    e.native(original.replace('snow ', ''), { start: 4, end: 9 });
    e.native(original, caret(9));
    expect(e.runs[0]).toEqual([
      'human',
      'The snow had been falling since dawn. ',
    ]);
  });

  it('waits for a composition to end, then recolors', () => {
    const e = editor(samplePreview());
    const original = e.text;
    const before = e.runs;
    const gone = 'quiet under it,';
    const at = original.indexOf('quiet');
    e.native(original.replace(gone, ''), { start: at, end: at + gone.length });
    e.native(original, caret(at + gone.length), true);
    expect(e.text).toBe(original);
    expect(e.runs).not.toEqual(before);
    expect(e.doc.pending).toEqual([endingId(0)]);
    e.flush();
    expect(e.runs).toEqual(before);
    expect(e.doc.pending).toEqual([]);
  });
});

describe('late reconcile results', () => {
  it('drops a result for an older revision of the passage', () => {
    const doc = samplePreview();
    const id = endingId(0);
    const at = documentText(doc).indexOf('quiet');
    const edited = applyEdits(doc, [{ start: at, end: at, inserted: '?' }]);
    const result = [
      {
        author: 'model' as const,
        text: edited.index.document.passages[1].runs
          .map((r) => r.text)
          .join(''),
      },
    ];
    expect(edited.revisions[id]).toBe(1);
    // A result for revision 0 arrives after the edit made it revision 1.
    expect(applyReconciled(edited, id, 0, result)).toBe(edited);
    // The current revision's result is applied.
    expect(applyReconciled(edited, id, 1, result)).not.toBe(edited);
  });
});
