import { describe, expect, it } from '@jest/globals';
import { applyPreviewEdit, previewRuns, previewText } from './buffer-preview';
import {
  STRESS_FIXTURE_LENGTH,
  STRESS_FIXTURE_SIZES,
  stressPreview,
} from './buffer-preview-fixture';

describe('stress fixture', () => {
  const state = stressPreview();

  it('is exactly 30,000 characters', () => {
    expect(previewText(state)).toHaveLength(STRESS_FIXTURE_LENGTH);
  });

  it('mixes human and model runs, none empty, none adjacent by one author', () => {
    const runs = previewRuns(state);
    expect(runs.length).toBeGreaterThan(50);
    expect(runs.every((run) => run.text.length > 0)).toBe(true);
    expect(new Set(runs.map((run) => run.author))).toEqual(
      new Set(['human', 'model'])
    );
    runs.slice(1).forEach((run, i) => {
      expect(run.author === 'model' && runs[i]?.author === 'model').toBe(false);
    });
  });

  it('numbers its paragraphs so a screenful identifies itself', () => {
    const text = previewText(state);
    expect(text.startsWith('Paragraph 001 human. ')).toBe(true);
    expect(text).toContain('Paragraph 050 ');
    expect(text).toContain('Paragraph 090 ');
  });

  it('takes an edit at the top, the middle and the end, text exact', () => {
    let next = state;
    for (const where of ['top', 'middle', 'end']) {
      const { length } = previewText(next);
      const at = where === 'top' ? 0 : where === 'end' ? length : length >> 1;
      next = applyPreviewEdit(next, { start: at, end: at, inserted: '§' });
    }
    expect(previewText(next)).toHaveLength(STRESS_FIXTURE_LENGTH + 3);
    expect(previewText(next).startsWith('§Paragraph')).toBe(true);
    expect(previewText(next).endsWith('§')).toBe(true);
    expect(
      previewRuns(next)
        .map((run) => run.text)
        .join('')
    ).toBe(previewText(next));
  });

  it('comes in the measured sizes, each the same text cut off', () => {
    const full = previewText(state);
    for (const size of STRESS_FIXTURE_SIZES) {
      const text = previewText(stressPreview(size));
      expect(text).toHaveLength(size);
      expect(full.startsWith(text)).toBe(true);
      expect(text.startsWith('Paragraph 001 human. ')).toBe(true);
    }
  });
});
