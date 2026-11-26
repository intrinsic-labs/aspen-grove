import { applyPreviewEdit, samplePreview, previewText } from '../buffer-preview';
import {
  mapModelRanges,
  mapModelRangesThrough,
  modelRangesOf,
  parseEditorMessage,
  replacementsToEdits,
  type ModelRange,
} from './web-editor-protocol';

describe('modelRangesOf', () => {
  it('lists the model runs by offset', () => {
    expect(
      modelRangesOf([
        { author: 'human', text: 'abc' },
        { author: 'model', text: 'defg' },
        { author: 'human', text: 'h' },
        { author: 'model', text: 'ij' },
      ])
    ).toEqual([
      [3, 7],
      [8, 10],
    ]);
  });
});

describe('mapModelRanges', () => {
  const range: ModelRange[] = [[10, 20]];

  it('shifts a range after the edit', () => {
    expect(mapModelRanges(range, { from: 2, to: 4, insert: 'abcde' })).toEqual([
      [13, 23],
    ]);
  });

  it('leaves a range before the edit alone', () => {
    expect(mapModelRanges(range, { from: 30, to: 30, insert: 'x' })).toEqual(
      range
    );
  });

  it('splits around text typed inside, which stays human', () => {
    expect(mapModelRanges(range, { from: 15, to: 15, insert: 'ab' })).toEqual([
      [10, 15],
      [17, 22],
    ]);
  });

  it('does not extend at either edge', () => {
    expect(mapModelRanges(range, { from: 10, to: 10, insert: 'a' })).toEqual([
      [11, 21],
    ]);
    expect(mapModelRanges(range, { from: 20, to: 20, insert: 'a' })).toEqual([
      [10, 20],
    ]);
  });

  it('drops deleted text and trims a straddling deletion', () => {
    expect(mapModelRanges(range, { from: 5, to: 25, insert: '' })).toEqual([]);
    expect(mapModelRanges(range, { from: 5, to: 12, insert: '' })).toEqual([
      [5, 13],
    ]);
    expect(mapModelRanges(range, { from: 18, to: 25, insert: 'z' })).toEqual([
      [10, 18],
    ]);
  });
});

describe('replacements', () => {
  it('apply as sequential edits that land the same text', () => {
    const replacements = [
      { from: 2, to: 4, insert: 'XYZ' },
      { from: 10, to: 10, insert: '!' },
    ];
    const source = 'abcdefghijklmnop';
    const edits = replacementsToEdits(replacements);
    expect(edits).toEqual([
      { start: 2, end: 4, inserted: 'XYZ' },
      { start: 11, end: 11, inserted: '!' },
    ]);
    const direct = replacements
      .slice()
      .reverse()
      .reduce(
        (text, r) => text.slice(0, r.from) + r.insert + text.slice(r.to),
        source
      );
    const sequential = edits.reduce(
      (text, e) => text.slice(0, e.start) + e.inserted + text.slice(e.end),
      source
    );
    expect(sequential).toBe(direct);
  });

  it('keep the host model in step with the page, authorship included', () => {
    const state = samplePreview();
    const text = previewText(state);
    const at = text.indexOf('lamps');
    const replacements = [{ from: at, to: at, insert: 'typed ' }];
    const next = replacementsToEdits(replacements).reduce(
      applyPreviewEdit,
      state
    );
    expect(previewText(next)).toBe(
      text.slice(0, at) + 'typed ' + text.slice(at)
    );
    const before = modelRangesOf([
      { author: 'human', text: text.slice(0, 38) },
      { author: 'model', text: text.slice(38) },
    ]);
    expect(mapModelRangesThrough(before, replacements)[0]).toEqual([
      38,
      at,
    ]);
  });
});

describe('parseEditorMessage', () => {
  const changes = {
    type: 'changes',
    epoch: 1,
    prevRevision: 2,
    revision: 3,
    replacements: [{ from: 0, to: 0, insert: 'a' }],
    selection: { anchor: 1, head: 1 },
    composing: false,
  };

  it('accepts ready, changes and checkpoints', () => {
    expect(parseEditorMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseEditorMessage(JSON.stringify(changes))).toEqual(changes);
    const restored = { ...changes, modelRanges: [[1, 4]] };
    expect(parseEditorMessage(JSON.stringify(restored))).toEqual(restored);
    const checkpoint = {
      type: 'checkpoint',
      epoch: 1,
      revision: 9,
      text: 'abc',
      modelRanges: [[0, 2]],
      seam: 1,
      selection: { anchor: 3, head: 3 },
      composing: false,
    };
    expect(parseEditorMessage(JSON.stringify(checkpoint))).toEqual(checkpoint);
    const composition = { type: 'composition', epoch: 1, composing: false };
    expect(parseEditorMessage(JSON.stringify(composition))).toEqual(composition);
    expect(
      parseEditorMessage('{"type":"composition","epoch":1,"composing":"no"}')
    ).toBeNull();
    expect(parseEditorMessage(JSON.stringify({ ...checkpoint, seam: undefined }))).toBeNull();
    expect(parseEditorMessage(JSON.stringify({ ...checkpoint, composing: undefined }))).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseEditorMessage('nope')).toBeNull();
    expect(parseEditorMessage('null')).toBeNull();
    expect(parseEditorMessage('{"type":"changes"}')).toBeNull();
    expect(
      parseEditorMessage(
        JSON.stringify({ ...changes, replacements: [{ from: 3, to: 1, insert: '' }] })
      )
    ).toBeNull();
    const { prevRevision: _omitted, ...withoutPrev } = changes;
    expect(parseEditorMessage(JSON.stringify(withoutPrev))).toBeNull();
    expect(
      parseEditorMessage(JSON.stringify({ ...changes, composing: 'yes' }))
    ).toBeNull();
    expect(
      parseEditorMessage(JSON.stringify({ ...changes, modelRanges: [[4, 1]] }))
    ).toBeNull();
    expect(
      parseEditorMessage('{"type":"checkpoint","epoch":1,"revision":1}')
    ).toBeNull();
  });
});
