import { applyPreviewEdit, runsLength, samplePreview } from '../buffer-preview';
import { replacementsToEdits, type Replacement } from './web-editor-protocol';
import { mapSeam, mapSeamThrough } from './web-editor-seam';

describe('mapSeam', () => {
  it('moves with an edit before it and ignores one after it', () => {
    expect(mapSeam(10, { from: 2, to: 4, insert: 'abcde' })).toBe(13);
    expect(mapSeam(10, { from: 12, to: 14, insert: '' })).toBe(10);
  });

  it('keeps text inserted at the seam on the ending side', () => {
    expect(mapSeam(10, { from: 10, to: 10, insert: 'xyz' })).toBe(10);
  });

  it('gives text of an edit that ends at the seam to the prefix', () => {
    expect(mapSeam(10, { from: 8, to: 10, insert: 'q' })).toBe(9);
  });

  it('gives the inserted text of a crossing edit to the prefix', () => {
    expect(mapSeam(10, { from: 8, to: 12, insert: 'abc' })).toBe(11);
    expect(mapSeam(10, { from: 8, to: 12, insert: '' })).toBe(8);
  });

  it('agrees with the host edit rule for every kind of edit', () => {
    const state = samplePreview();
    const seam = runsLength(state.prefix);
    const total = seam + runsLength(state.suffixes[0]);
    const inserts = ['', 'x', 'longer text'];
    for (let from = 0; from <= total; from += 3) {
      for (let to = from; to <= total; to += 5) {
        for (const insert of inserts) {
          const replacement: Replacement = { from, to, insert };
          const edited = applyPreviewEdit(state, replacementsToEdits([replacement])[0]);
          expect(runsLength(edited.prefix)).toBe(mapSeam(seam, replacement));
        }
      }
    }
  });
});

describe('mapSeamThrough', () => {
  it('applies several replacements of one change in order', () => {
    const replacements: Replacement[] = [
      { from: 1, to: 2, insert: 'abc' },
      { from: 12, to: 13, insert: '' },
    ];
    expect(mapSeamThrough(10, replacements)).toBe(12);
  });
});
