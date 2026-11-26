import { describe, expect, it } from '@jest/globals';
import { applyReplacements } from './apply-replacement';
import { TAIL_OWNER, materialize, ownerAt, rangeOf } from './document-ranges';
import {
  BEAMING,
  E_ACUTE,
  FAMILY,
  GRIN,
  HINDI_KI,
  THUMB_DARK,
  THUMB_MID,
  human,
  indexOf,
  model,
  pairs,
  passage,
  SEGMENTER_PATHS,
  useSegmenter,
} from './document-fixtures';

const A = { kind: 'passage', id: 'a' } as const;
const B = { kind: 'passage', id: 'b' } as const;
const C = { kind: 'passage', id: 'c' } as const;

const insert = (start: number, inserted: string) => ({
  start,
  end: start,
  inserted,
});

// "The cat " (a) | "sat on " (b, model) | "the mat" (c) | tail "."
const story = () =>
  indexOf(
    [
      passage('a', human('The cat ')),
      passage('b', model('sat on ')),
      passage('c', model('the mat')),
    ],
    human('.')
  );

describe('applyReplacements', () => {
  it('insertion shifts every downstream range', () => {
    const before = story();
    const { index } = applyReplacements(before, [insert(3, 'XYZ')]);
    expect(index.ranges.map((r) => [r.start, r.end])).toEqual([
      [0, 11],
      [11, 18],
      [18, 25],
      [25, 26],
    ]);
    expect(index.length).toBe(before.length + 3);
    expect(materialize(index).text).toBe('TheXYZ cat sat on the mat.');
  });

  it('shrinking to zero retains affinity', () => {
    // Delete all of b, then type where it was.
    const emptied = applyReplacements(story(), [
      { start: 8, end: 15, inserted: '' },
    ]);
    expect(rangeOf(emptied.index, B)).toEqual({ owner: B, start: 8, end: 8 });
    expect(emptied.affinity).toEqual(B);

    const held = applyReplacements(
      emptied.index,
      [insert(8, 'x')],
      emptied.affinity
    );
    expect(rangeOf(held.index, B)).toEqual({ owner: B, start: 8, end: 9 });
    expect(held.index.document.passages[1]?.runs).toEqual([human('x')]);

    // A fresh caret there belongs to the right-hand node instead.
    const fresh = applyReplacements(emptied.index, [insert(8, 'x')]);
    expect(rangeOf(fresh.index, C)?.end).toBe(8 + 1 + 'the mat'.length);
    expect(rangeOf(fresh.index, B)).toEqual({ owner: B, start: 8, end: 8 });
  });

  it('keeps typing in the same passage after backspace at its end', () => {
    const back = applyReplacements(story(), [
      { start: 14, end: 15, inserted: '' },
    ]);
    expect(back.affinity).toEqual(B);
    expect(ownerAt(back.index, 14).owner).toEqual(C);
    const typed = applyReplacements(
      back.index,
      [insert(14, 'z')],
      back.affinity
    );
    expect(typed.touched).toEqual([B]);
    expect(pairs(typed.index)).toEqual([
      ['human', 'The cat '],
      ['model', 'sat on'],
      ['human', 'z'],
      ['model', 'the mat'],
      ['human', '.'],
    ]);
  });

  it('fresh EOF insert grows tail', () => {
    const { index, touched, affinity } = applyReplacements(story(), [
      insert(story().length, ' More'),
    ]);
    expect(touched).toEqual([TAIL_OWNER]);
    expect(affinity).toEqual(TAIL_OWNER);
    expect(rangeOf(index, TAIL_OWNER)).toEqual({
      owner: TAIL_OWNER,
      start: 22,
      end: 28,
    });
    expect(rangeOf(index, C)).toEqual({ owner: C, start: 15, end: 22 });
  });

  it('gives a fresh insertion at a seam to the right-hand node', () => {
    const { index, touched } = applyReplacements(story(), [insert(8, 'so ')]);
    expect(touched).toEqual([B]);
    expect(rangeOf(index, A)).toEqual({ owner: A, start: 0, end: 8 });
    expect(rangeOf(index, B)).toEqual({ owner: B, start: 8, end: 18 });
  });

  it('selection crossing two committed nodes and tail', () => {
    // From "cat" in a, through all of b and c, into the tail's ".".
    const { index, touched } = applyReplacements(story(), [
      { start: 4, end: 23, inserted: 'X' },
    ]);
    expect(touched).toEqual([A, B, C, TAIL_OWNER]);
    expect(materialize(index).text).toBe('The X');
    expect(pairs(index)).toEqual([['human', 'The X']]);
    // Every intersection is deleted; b and c stay as zero-width nodes.
    expect(rangeOf(index, A)).toEqual({ owner: A, start: 0, end: 5 });
    expect(rangeOf(index, B)).toEqual({ owner: B, start: 5, end: 5 });
    expect(rangeOf(index, C)).toEqual({ owner: C, start: 5, end: 5 });
    expect(rangeOf(index, TAIL_OWNER)).toEqual({
      owner: TAIL_OWNER,
      start: 5,
      end: 5,
    });
  });

  it('paste belongs to first owner', () => {
    const { index, affinity } = applyReplacements(story(), [
      { start: 10, end: 18, inserted: 'PASTE' },
    ]);
    expect(affinity).toEqual(B);
    expect(index.document.passages.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(pairs(index)).toEqual([
      ['human', 'The cat '],
      ['model', 'sa'],
      ['human', 'PASTE'],
      ['model', ' mat'],
      ['human', '.'],
    ]);
    expect(rangeOf(index, B)).toEqual({ owner: B, start: 8, end: 15 });
    expect(rangeOf(index, C)).toEqual({ owner: C, start: 15, end: 19 });
  });

  it('deletions create no colored ghost text', () => {
    const { index } = applyReplacements(story(), [
      { start: 9, end: 12, inserted: '' },
    ]);
    const { text, runs } = materialize(index);
    expect(text).toBe('The cat son the mat.');
    expect(runs.every((run) => run.text.length > 0)).toBe(true);
    expect(runs.map((run) => run.text).join('')).toBe(text);
    expect(pairs(index)[1]).toEqual(['model', 'son the mat']);
    const [pa, pb] = index.document.passages;
    expect(pa?.runs).toEqual([human('The cat ')]);
    expect(pb?.runs).toEqual([model('son ')]);
    // Deleting a whole model passage leaves no run at all.
    const gone = applyReplacements(story(), [
      { start: 8, end: 15, inserted: '' },
    ]);
    expect(gone.index.document.passages[1]?.runs).toEqual([]);
  });

  it('two separated edits keep the unchanged island blue', () => {
    const start = indexOf([passage('a', model('The quick brown fox jumps'))]);
    const { index } = applyReplacements(start, [
      { start: 4, end: 9, inserted: 'slow' },
      { start: 16, end: 19, inserted: 'cat' },
    ]);
    expect(pairs(index)).toEqual([
      ['model', 'The '],
      ['human', 'slow'],
      ['model', ' brown '],
      ['human', 'cat'],
      ['model', ' jumps'],
    ]);
  });

  it('applies a transaction against the old layout, in any listed order', () => {
    const edits = [
      insert(0, '1'),
      { start: 4, end: 7, inserted: '' },
      insert(8, '2'),
    ];
    const forward = applyReplacements(story(), edits);
    const backward = applyReplacements(story(), [...edits].reverse());
    expect(materialize(forward.index).text).toBe('1The  2sat on the mat.');
    expect(materialize(backward.index)).toEqual(materialize(forward.index));
    expect(forward.affinity).toEqual(A);
  });

  it('keeps the listed order of insertions at one offset', () => {
    const { index } = applyReplacements(story(), [
      insert(4, 'a'),
      insert(4, 'b'),
    ]);
    expect(materialize(index).text).toBe('The abcat sat on the mat.');
  });

  it('rejects overlapping replacements and clamps wild offsets', () => {
    expect(() =>
      applyReplacements(story(), [
        { start: 2, end: 6, inserted: '' },
        { start: 4, end: 8, inserted: '' },
      ])
    ).toThrow(RangeError);
    const clamped = applyReplacements(indexOf([passage('a', human('ab'))]), [
      { start: -5, end: -1, inserted: '>' },
      { start: 9, end: 99, inserted: '<' },
    ]);
    expect(materialize(clamped.index).text).toBe('>ab<');
  });

  it('does nothing for an empty transaction', () => {
    const before = story();
    const result = applyReplacements(before, [insert(3, '')], B);
    expect(result.index.document).toEqual(before.document);
    expect(result.touched).toEqual([]);
    expect(result.affinity).toEqual(B);
  });
});

describe.each(SEGMENTER_PATHS)(
  'grapheme clusters with %s',
  (_name, useNative) => {
    useSegmenter(useNative);

    const modelDoc = (text: string) => indexOf([passage('a', model(text))]);

    it('typing a combining mark after a model letter makes the cluster human', () => {
      const { index } = applyReplacements(modelDoc('cafe!'), [insert(4, '́')]);
      expect(pairs(index)).toEqual([
        ['model', 'caf'],
        ['human', E_ACUTE],
        ['model', '!'],
      ]);
    });

    it('an emoji swapped for one sharing its high surrogate never splits a pair', () => {
      const { index } = applyReplacements(modelDoc(`x${GRIN}y`), [
        { start: 2, end: 3, inserted: BEAMING.slice(1) },
      ]);
      expect(materialize(index).text).toBe(`x${BEAMING}y`);
      expect(pairs(index)).toEqual([
        ['model', 'x'],
        ['human', BEAMING],
        ['model', 'y'],
      ]);
    });

    it('a skin-tone change recolors the whole cluster', () => {
      const { index } = applyReplacements(modelDoc(`${THUMB_MID}!`), [
        { start: 2, end: 4, inserted: THUMB_DARK.slice(2) },
      ]);
      expect(pairs(index)).toEqual([
        ['human', THUMB_DARK],
        ['model', '!'],
      ]);
    });

    it('deleting a ZWJ family removes the cluster and nothing else', () => {
      const { index } = applyReplacements(modelDoc(`a${FAMILY}b`), [
        { start: 1, end: 1 + FAMILY.length, inserted: '' },
      ]);
      expect(pairs(index)).toEqual([['model', 'ab']]);
    });

    it('a regional indicator typed before a model one pairs with it', () => {
      // 🇺 + 🇫🇷 reads as the pair 🇺🇫 and a stray 🇷: the pair is the human's.
      const { index } = applyReplacements(modelDoc('🇫🇷'), [
        insert(0, '\u{1F1FA}'),
      ]);
      expect(pairs(index)).toEqual([
        ['human', '🇺🇫'],
        ['model', '🇷'],
      ]);
    });

    it('an Indic spacing mark typed after a model consonant joins its cluster', () => {
      const { index } = applyReplacements(modelDoc('कx'), [insert(1, 'ि')]);
      expect(materialize(index).text).toBe(`${HINDI_KI}x`);
      expect(pairs(index)).toEqual([
        ['human', HINDI_KI],
        ['model', 'x'],
      ]);
    });
  }
);
