import { describe, expect, it } from '@jest/globals';
import {
  applyEdits,
  documentRuns as previewRuns,
  documentText as previewText,
  emptyPreview,
  noteSelection,
  prefixLength,
  releaseHold,
  selectSibling as selectPreviewSibling,
  siblingCount,
} from './buffer-preview-document';
import { samplePreview } from './buffer-preview-sample';

const applyPreviewEdit = (
  doc: ReturnType<typeof samplePreview>,
  edit: { start: number; end: number; inserted: string }
) => applyEdits(doc, [edit]);

const authors = (state: ReturnType<typeof samplePreview>) =>
  previewRuns(state).map((run) => [run.author, run.text]);

describe('sample', () => {
  it('has a human opening, a model ending and a human word inside it', () => {
    const runs = previewRuns(samplePreview());
    expect(runs.map((run) => run.author)).toEqual([
      'human',
      'model',
      'human',
      'model',
    ]);
    expect(runs[2]?.text).toBe('old');
  });

  it('has two siblings with different endings', () => {
    const first = samplePreview();
    const second = selectPreviewSibling(first, 1);
    expect(siblingCount(first)).toBe(2);
    expect(previewText(second).startsWith('The snow had been falling')).toBe(
      true
    );
    expect(previewText(second)).not.toBe(previewText(first));
    expect(previewRuns(second).map((run) => run.author)).toEqual([
      'human',
      'model',
    ]);
  });
});

describe('edits', () => {
  it('shows a word typed into a model run as human', () => {
    const state = samplePreview();
    const at = previewText(state).indexOf('quiet') + 'qui'.length;
    const next = applyPreviewEdit(state, {
      start: at,
      end: at,
      inserted: 'XYZ',
    });
    const typed = previewRuns(next).filter((run) => run.author === 'human');
    expect(typed.map((run) => run.text)).toContain('XYZ');
    expect(previewText(next)).toContain('quiXYZet');
    // The model text around it is split, not recolored.
    expect(
      previewRuns(next).filter((run) => run.author === 'model')
    ).toHaveLength(3);
  });

  it('merges adjacent human text into one run', () => {
    const state = samplePreview();
    const at = previewText(state).indexOf('old');
    const next = applyPreviewEdit(state, {
      start: at + 3,
      end: at + 3,
      inserted: 'er',
    });
    expect(previewRuns(next).find((run) => run.text === 'older')).toMatchObject(
      {
        author: 'human',
      }
    );
  });

  it('deleting leaves no colored ghost text', () => {
    const state = samplePreview();
    const at = previewText(state).indexOf('old');
    const next = applyPreviewEdit(state, {
      start: at,
      end: at + 3,
      inserted: '',
    });
    expect(previewText(next)).not.toContain(
      'old harbour'.replace('old ', 'old')
    );
    expect(previewRuns(next).every((run) => run.text.length > 0)).toBe(true);
  });

  it('gives an insertion at the seam to the ending', () => {
    const state = samplePreview();
    const seam = prefixLength(state);
    const next = applyPreviewEdit(state, {
      start: seam,
      end: seam,
      inserted: 'So ',
    });
    expect(prefixLength(next)).toBe(seam);
    expect(previewText(next)).toContain('dawn. So By evening');
  });

  it('gives a replacement across the seam to the prefix and trims the ending', () => {
    const state = samplePreview();
    const seam = prefixLength(state);
    const next = applyPreviewEdit(state, {
      start: seam - 2,
      end: seam + 3,
      inserted: '!',
    });
    expect(
      previewText(next).startsWith('The snow had been falling since dawn!')
    ).toBe(true);
    expect(previewText(next)).toContain('!evening');
  });

  it('keeps edits to one ending out of the other', () => {
    const state = samplePreview();
    const at = previewText(state).length;
    const edited = applyPreviewEdit(state, {
      start: at,
      end: at,
      inserted: ' Fin.',
    });
    expect(previewText(edited).endsWith('yellow. Fin.')).toBe(true);
    expect(previewText(selectPreviewSibling(edited, 1))).not.toContain('Fin.');
    expect(previewText(selectPreviewSibling(edited, 0))).toContain('Fin.');
  });

  it('keeps an edit to the opening when the ending is switched', () => {
    const edited = applyPreviewEdit(samplePreview(), {
      start: 0,
      end: 3,
      inserted: 'A',
    });
    const switched = selectPreviewSibling(edited, 1);
    expect(previewText(switched).startsWith('A snow had been')).toBe(true);
    expect(authors(switched)[0]).toEqual([
      'human',
      'A snow had been falling since dawn. ',
    ]);
  });

  it('types into an empty buffer as human text', () => {
    const next = applyPreviewEdit(emptyPreview(), {
      start: 0,
      end: 0,
      inserted: 'Hello.',
    });
    expect(previewRuns(next)).toEqual([{ author: 'human', text: 'Hello.' }]);
  });

  it('clamps an out-of-range edit', () => {
    const next = applyPreviewEdit(emptyPreview(), {
      start: 9,
      end: 20,
      inserted: 'x',
    });
    expect(previewText(next)).toBe('x');
  });
});

describe('the working tail', () => {
  it('takes text typed at the end, and goes with its ending on a switch', () => {
    const state = samplePreview();
    const end = previewText(state).length;
    const typed = applyEdits(state, [{ start: end, end, inserted: '!' }]);
    expect(typed.index.document.tail).toEqual([{ author: 'human', text: '!' }]);
    const away = selectPreviewSibling(typed, 1);
    expect(away.index.document.tail).toEqual([]);
    expect(
      previewText(selectPreviewSibling(away, 0)).endsWith('yellow.!')
    ).toBe(true);
  });
});

describe('left affinity', () => {
  const emptied = () => {
    const state = samplePreview();
    const seam = prefixLength(state);
    // Backspace the whole opening, one tap, then type where the caret is.
    return applyEdits(state, [{ start: 0, end: seam, inserted: '' }], {
      caret: 0,
    });
  };

  it('keeps typing in a passage that was deleted to nothing', () => {
    const typed = applyEdits(emptied(), [{ start: 0, end: 0, inserted: 'N' }]);
    expect(typed.index.document.passages[0].runs).toEqual([
      { author: 'human', text: 'N' },
    ]);
  });

  it('is gone once an edit lands away from the caret', () => {
    const typed = applyEdits(emptied(), [{ start: 5, end: 5, inserted: 'N' }]);
    expect(typed.hold?.kind === 'passage' && typed.hold.id).not.toBe('prefix');
    expect(typed.index.document.passages[0].runs).toEqual([]);
  });

  it('is cleared by a selection that moved the caret, then back to it', () => {
    let doc = emptied();
    doc = noteSelection(doc, { start: 40, end: 40 });
    doc = noteSelection(doc, { start: 0, end: 0 });
    expect(doc.hold).toBeUndefined();
    const typed = applyEdits(doc, [{ start: 0, end: 0, inserted: 'N' }]);
    expect(typed.index.document.passages[0].runs).toEqual([]);
  });

  it('survives its own edit’s selection event, before or after the change', () => {
    // Selection first: the event is the post-edit caret, then the change.
    let doc = emptied();
    doc = noteSelection(doc, { start: 1, end: 1 });
    doc = applyEdits(doc, [{ start: 0, end: 0, inserted: 'N' }]);
    expect(doc.index.document.passages[0].runs).toEqual([
      { author: 'human', text: 'N' },
    ]);
    // Change first: the event lands on the caret the edit left, twice over.
    doc = applyEdits(doc, [{ start: 1, end: 1, inserted: 'O' }]);
    doc = noteSelection(doc, { start: 2, end: 2 });
    doc = noteSelection(doc, { start: 2, end: 2 });
    expect(doc.hold).toBeDefined();
    doc = applyEdits(doc, [{ start: 2, end: 2, inserted: 'P' }]);
    expect(doc.index.document.passages[0].runs).toEqual([
      { author: 'human', text: 'NOP' },
    ]);
  });

  it('is cleared when the Android page reports the caret moved', () => {
    const doc = releaseHold(emptied());
    expect(doc.hold).toBeUndefined();
    const typed = applyEdits(doc, [{ start: 0, end: 0, inserted: 'N' }]);
    expect(typed.index.document.passages[0].runs).toEqual([]);
    // Nothing held: nothing to release.
    expect(releaseHold(doc)).toBe(doc);
  });

  it('is cleared by a range selection', () => {
    expect(noteSelection(emptied(), { start: 0, end: 4 }).hold).toBeUndefined();
  });
});
