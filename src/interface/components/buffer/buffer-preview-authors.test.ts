import {
  applyPreviewEdit,
  previewRuns,
  previewText,
  samplePreview,
  selectPreviewSibling,
} from './buffer-preview';
import { modelRangesOf } from './android/web-editor-protocol';
import {
  adoptCheckpoint,
  relabelPreview,
  runsFromRanges,
} from './buffer-preview-authors';

describe('runsFromRanges', () => {
  it('marks the ranges as the model and the rest as the human', () => {
    expect(runsFromRanges('abcdef', [[1, 3]])).toEqual([
      { author: 'human', text: 'a' },
      { author: 'model', text: 'bc' },
      { author: 'human', text: 'def' },
    ]);
  });
});

describe('relabelPreview', () => {
  it('restores authorship for undone text and keeps the siblings', () => {
    const sample = samplePreview();
    const text = previewText(sample);
    const at = text.indexOf('By evening');
    // Undo reinserts deleted model text as an ordinary edit: the host reads it
    // as the human's until the page says otherwise.
    const deleted = applyPreviewEdit(sample, {
      start: at,
      end: at + 10,
      inserted: '',
    });
    const reinserted = applyPreviewEdit(deleted, {
      start: at,
      end: at,
      inserted: 'By evening',
    });
    expect(previewText(reinserted)).toBe(text);
    expect(previewRuns(reinserted)).not.toEqual(previewRuns(sample));

    const restored = relabelPreview(
      reinserted,
      modelRangesOf(previewRuns(sample))
    );
    expect(previewRuns(restored)).toEqual(previewRuns(sample));
    expect(restored.suffixes).toHaveLength(2);
    expect(previewText(selectPreviewSibling(restored, 1))).toContain('Nobody');
  });
});

describe('adoptCheckpoint', () => {
  it('takes the page text and authorship, split at the page seam', () => {
    const state = samplePreview();
    const page = previewText(state).replace('lamps', 'LAMPS and more');
    const at = page.indexOf('By evening');
    const adopted = adoptCheckpoint(state, page, [[at, page.length]], at);
    expect(previewText(adopted)).toBe(page);
    expect(previewRuns(adopted)[0]).toEqual({
      author: 'human',
      text: page.slice(0, at),
    });
    expect(adopted.suffixes).toHaveLength(2);
  });

  it('keeps branch-local text out of the prefix when missed edits span the seam', () => {
    const state = samplePreview();
    const before = previewText(state);
    const seam = before.indexOf('By evening');
    // The page made one edit on each side of the seam that the host missed,
    // and the first one is longer than what it replaced.
    const page = before.replace('snow', 'heavy snow').replace('lamps', 'LAMPS');
    const pageSeam = seam + ('heavy snow'.length - 'snow'.length);
    const adopted = adoptCheckpoint(
      state,
      page,
      [[pageSeam, page.length]],
      pageSeam
    );
    expect(previewText(adopted)).toBe(page);
    expect(adopted.prefix.map((run) => run.text).join('')).toBe(
      'The heavy snow had been falling since dawn. '
    );
    const other = previewText(selectPreviewSibling(adopted, 1));
    expect(other).toBe(
      'The heavy snow had been falling since dawn. Nobody went out. The kettles sang in every kitchen, and the children ' +
        'pressed their faces to the glass, waiting for the world to begin again.'
    );
  });

  it('leaves an identical document alone', () => {
    const state = samplePreview();
    const text = previewText(state);
    const seam = text.indexOf('By evening');
    const same = adoptCheckpoint(state, text, [[seam, text.length]], seam);
    expect(previewText(same)).toBe(text);
    expect(same.prefix).toEqual(state.prefix);
  });
});
