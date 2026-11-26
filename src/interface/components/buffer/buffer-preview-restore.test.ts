import {
  type OwnerLayout,
  advanceLayout,
} from '@application/services/buffer/owner-layout';
import { modelRangesOf } from './android/web-editor-protocol';
import {
  applyEdits,
  documentEnds,
  documentRuns,
  documentText,
  emptyPreview,
  previewDocument,
  selectSibling,
} from './buffer-preview-document';
import { adopt, relabel, runsFromRanges } from './buffer-preview-restore';
import { samplePreview } from './buffer-preview-sample';

describe('runsFromRanges', () => {
  it('marks the ranges as the model and the rest as the human', () => {
    expect(runsFromRanges('abcdef', [[1, 3]])).toEqual([
      { author: 'human', text: 'a' },
      { author: 'model', text: 'bc' },
      { author: 'human', text: 'def' },
    ]);
  });
});

describe('relabel', () => {
  it('restores authorship for undone text and keeps the siblings', () => {
    const sample = samplePreview();
    const text = documentText(sample);
    const at = text.indexOf('By evening');
    // Undo reinserts deleted model text as an ordinary edit: the host reads it
    // as the human's until the page says otherwise.
    const exact = { exactColors: true };
    const deleted = applyEdits(
      sample,
      [{ start: at, end: at + 10, inserted: '' }],
      exact
    );
    const reinserted = applyEdits(
      deleted,
      [{ start: at, end: at, inserted: 'By evening' }],
      exact
    );
    expect(documentText(reinserted)).toBe(text);
    expect(documentRuns(reinserted)).not.toEqual(documentRuns(sample));

    const restored = relabel(reinserted, modelRangesOf(documentRuns(sample)));
    expect(documentRuns(restored)).toEqual(documentRuns(sample));
    expect(restored.endings).toHaveLength(2);
    expect(documentText(selectSibling(restored, 1))).toContain('Nobody');
  });

  it('colors across passages and the tail from one set of ranges', () => {
    const doc = applyEdits(
      previewDocument({
        prefix: [{ author: 'human', text: 'ab' }],
        endings: [[{ author: 'model', text: 'cd' }]],
      }),
      [{ start: 4, end: 4, inserted: 'ef' }]
    );
    expect(documentEnds(doc)).toEqual([2, 4, 6]);
    const relabelled = relabel(doc, [[1, 5]]);
    expect(documentRuns(relabelled)).toEqual([
      { author: 'human', text: 'a' },
      { author: 'model', text: 'bcde' },
      { author: 'human', text: 'f' },
    ]);
    expect(documentEnds(relabelled)).toEqual([2, 4, 6]);
  });
});

describe('adopt', () => {
  it('takes the page text and authorship, split at the page layout', () => {
    const state = samplePreview();
    const page = documentText(state).replace('lamps', 'LAMPS and more');
    const at = page.indexOf('By evening');
    const adopted = adopt(
      state,
      page,
      [[at, page.length]],
      { ends: [at, page.length, page.length] },
      page.length
    );
    expect(documentText(adopted)).toBe(page);
    expect(documentRuns(adopted)[0]).toEqual({
      author: 'human',
      text: page.slice(0, at),
    });
    expect(adopted.endings).toHaveLength(2);
  });

  it('keeps branch-local text out of the prefix when missed edits span the seam', () => {
    const state = samplePreview();
    const before = documentText(state);
    const seam = before.indexOf('By evening');
    const page = before.replace('snow', 'heavy snow').replace('lamps', 'LAMPS');
    const pageSeam = seam + ('heavy snow'.length - 'snow'.length);
    const adopted = adopt(
      state,
      page,
      [[pageSeam, page.length]],
      { ends: [pageSeam, page.length, page.length] },
      0
    );
    expect(documentText(adopted)).toBe(page);
    expect(
      adopted.index.document.passages[0].runs.map((r) => r.text).join('')
    ).toBe('The heavy snow had been falling since dawn. ');
    expect(documentText(selectSibling(adopted, 1))).toBe(
      'The heavy snow had been falling since dawn. Nobody went out. The kettles sang in every kitchen, and the children ' +
        'pressed their faces to the glass, waiting for the world to begin again.'
    );
  });

  it('leaves an identical document alone', () => {
    const state = samplePreview();
    const text = documentText(state);
    const same = adopt(
      state,
      text,
      modelRangesOf(documentRuns(state)),
      { ends: documentEnds(state) },
      0
    );
    expect(documentRuns(same)).toEqual(documentRuns(state));
    expect(documentEnds(same)).toEqual(documentEnds(state));
  });

  it('rebuilds exactly the document the host reached by itself (seam-exact)', () => {
    // The same transactions through the host reducer and through the page's
    // layout plus a checkpoint adopt: backspace to the end of the prefix then
    // type, and typing at the very end.
    const edits = [
      { edit: { start: 0, end: 0, inserted: '' }, caret: 0 },
      { edit: { start: 30, end: 39, inserted: '' }, caret: 30 },
      { edit: { start: 30, end: 30, inserted: 'Z' }, caret: 31 },
    ];
    let host = emptyPreview();
    host = previewDocument({
      prefix: [{ author: 'human', text: 'x'.repeat(39) }],
      endings: [[{ author: 'model', text: 'y'.repeat(20) }]],
    });
    let layout: OwnerLayout = { ends: documentEnds(host) };
    for (const { edit, caret } of edits) {
      host = applyEdits(host, [edit], { caret });
      layout = advanceLayout(layout, [edit], caret);
    }
    // Backspace the whole opening, then type at its end: left affinity.
    for (const { edit, caret } of [
      { edit: { start: 0, end: 31, inserted: '' }, caret: 0 },
      { edit: { start: 0, end: 0, inserted: 'N' }, caret: 1 },
      { edit: { start: 21, end: 21, inserted: '!' }, caret: 22 },
    ]) {
      host = applyEdits(host, [edit], { caret });
      layout = advanceLayout(layout, [edit], caret);
    }
    const resumed = adopt(
      previewDocument({
        prefix: [],
        endings: [[]],
      }),
      documentText(host),
      modelRangesOf(documentRuns(host)),
      layout,
      22
    );
    expect(documentEnds(resumed)).toEqual(documentEnds(host));
    expect(documentRuns(resumed)).toEqual(documentRuns(host));
    expect(resumed.hold).toEqual(host.hold);
    expect(resumed.index.document.passages.map((p) => p.id)).toEqual(
      host.index.document.passages.map((p) => p.id)
    );
  });
});
