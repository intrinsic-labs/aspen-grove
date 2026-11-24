import { describe, expect, it } from '@jest/globals';
import { deriveReplacement } from './BufferTextInput';
import {
  applyPreviewEdit,
  emptyPreview,
  previewRuns,
  previewText,
  samplePreview,
  selectPreviewSibling,
  siblingCount,
} from './buffer-preview';

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
    const seam = state.prefix.map((run) => run.text).join('').length;
    const next = applyPreviewEdit(state, {
      start: seam,
      end: seam,
      inserted: 'So ',
    });
    expect(next.prefix).toEqual(state.prefix);
    expect(previewText(next)).toContain('dawn. So By evening');
  });

  it('gives a replacement across the seam to the prefix and trims the ending', () => {
    const state = samplePreview();
    const seam = state.prefix.map((run) => run.text).join('').length;
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

describe('deriveReplacement', () => {
  it('reads a typed character at the caret', () => {
    expect(deriveReplacement('ab', 'aXb', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 1,
      inserted: 'X',
    });
  });

  it('puts a repeated character at the actual caret', () => {
    expect(deriveReplacement('aaa', 'aaaa', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 1,
      inserted: 'a',
    });
    expect(deriveReplacement('aaa', 'aaaa', { start: 3, end: 3 })).toEqual({
      start: 3,
      end: 3,
      inserted: 'a',
    });
  });

  it('reads backspace and forward delete at the caret', () => {
    expect(deriveReplacement('aaa', 'aa', { start: 2, end: 2 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
    expect(deriveReplacement('abc', 'ac', { start: 1, end: 1 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
    expect(deriveReplacement('abc', 'ac', { start: 2, end: 2 })).toEqual({
      start: 1,
      end: 2,
      inserted: '',
    });
  });

  it('reads a paste over a selection', () => {
    expect(
      deriveReplacement('hello world', 'hello there', { start: 6, end: 11 })
    ).toEqual({
      start: 6,
      end: 11,
      inserted: 'there',
    });
  });

  it('recovers an autocorrect that replaces more than the selection', () => {
    expect(deriveReplacement('I teh', 'I the', { start: 5, end: 5 })).toEqual({
      start: 3,
      end: 5,
      inserted: 'he',
    });
  });

  it('falls back to common ends with no selection', () => {
    expect(deriveReplacement('abcd', 'abXd', null)).toEqual({
      start: 2,
      end: 3,
      inserted: 'X',
    });
  });

  it('reports no change for equal strings', () => {
    expect(deriveReplacement('same', 'same', { start: 1, end: 1 })).toBeNull();
  });
});
