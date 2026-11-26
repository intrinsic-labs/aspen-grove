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
  it('turns the host text into the page text with its authorship', () => {
    const state = samplePreview();
    const page = previewText(state).replace('lamps', 'LAMPS and more');
    const at = page.indexOf('By evening');
    const adopted = adoptCheckpoint(state, page, [[at, page.length]]);
    expect(previewText(adopted)).toBe(page);
    expect(previewRuns(adopted)[0]).toEqual({
      author: 'human',
      text: page.slice(0, at),
    });
    expect(adopted.suffixes).toHaveLength(2);
  });

  it('leaves an identical document alone', () => {
    const state = samplePreview();
    const same = adoptCheckpoint(state, previewText(state), [
      [38, previewText(state).length],
    ]);
    expect(previewText(same)).toBe(previewText(state));
  });
});
