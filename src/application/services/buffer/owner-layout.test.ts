import { describe, expect, it } from '@jest/globals';
import { applyReplacements, type Replacement } from './apply-replacement';
import { human, indexOf, model, passage } from './document-fixtures';
import { type OwnerLayout, advanceLayout, keepsHold } from './owner-layout';
import { type DocumentIndex, type RangeOwner } from './document-ranges';

const rep = (start: number, end: number, inserted: string): Replacement => ({
  start,
  end,
  inserted,
});

const start = (): { index: DocumentIndex; layout: OwnerLayout } => ({
  index: indexOf(
    [passage('0', human('prefix ')), passage('1', model('ending text'))],
    human('tail')
  ),
  layout: { ends: [7, 18, 22] },
});

const ownerIndex = (index: DocumentIndex, owner: RangeOwner | undefined) =>
  owner === undefined
    ? undefined
    : index.ranges.findIndex(
        (range) =>
          range.owner.kind === owner.kind &&
          (owner.kind === 'tail' ||
            (range.owner as { id: string }).id === owner.id)
      );

/** The host's way of carrying hold, mirrored from the adapter. */
const hostStep = (
  state: { index: DocumentIndex; hold?: RangeOwner; caret?: number },
  replacements: readonly Replacement[],
  caretAfter: number
) => {
  const hold = keepsHold(state.caret, replacements) ? state.hold : undefined;
  const result = applyReplacements(state.index, replacements, hold);
  return {
    index: result.index,
    hold: result.touched.length === 0 ? hold : result.affinity,
    caret: caretAfter,
  };
};

describe('keepsHold', () => {
  it('keeps affinity for typing at, backspace behind and delete ahead of the caret', () => {
    expect(keepsHold(5, [rep(5, 5, 'a')])).toBe(true);
    expect(keepsHold(5, [rep(4, 5, '')])).toBe(true);
    expect(keepsHold(5, [rep(5, 6, '')])).toBe(true);
  });

  it('drops it once the next edit lands somewhere else, or with no caret', () => {
    expect(keepsHold(5, [rep(9, 9, 'a')])).toBe(false);
    expect(keepsHold(undefined, [rep(5, 5, 'a')])).toBe(false);
  });
});

describe('advanceLayout matches the reducer', () => {
  it('moves every boundary the way the document ranges move', () => {
    const { index, layout } = start();
    const next = advanceLayout(layout, [rep(2, 2, 'ZZ')], 4);
    const host = applyReplacements(index, [rep(2, 2, 'ZZ')]);
    expect(next.ends).toEqual(host.index.ranges.map((range) => range.end));
  });

  it('keeps left affinity after deleting to a passage end, in both', () => {
    const { index, layout } = start();
    // Backspace the whole prefix "prefix " (7 chars), caret ends at 0.
    const host = hostStep({ index }, [rep(0, 7, '')], 0);
    const page = advanceLayout(layout, [rep(0, 7, '')], 0);
    expect(page.ends).toEqual(host.index.ranges.map((range) => range.end));
    expect(page.hold).toBe(ownerIndex(host.index, host.hold));
    // Typing right after goes to the emptied prefix, not the ending.
    const typedHost = hostStep(host, [rep(0, 0, 'N')], 1);
    const typedPage = advanceLayout(page, [rep(0, 0, 'N')], 1);
    expect(typedHost.index.ranges[0]).toMatchObject({ start: 0, end: 1 });
    expect(typedPage.ends).toEqual(
      typedHost.index.ranges.map((range) => range.end)
    );
  });

  it('puts text typed at the very end in the tail, in both', () => {
    const { index, layout } = start();
    const host = hostStep({ index }, [rep(22, 22, '!')], 23);
    const page = advanceLayout(layout, [rep(22, 22, '!')], 23);
    expect(page.ends).toEqual([7, 18, 23]);
    expect(host.index.ranges.map((range) => range.end)).toEqual([7, 18, 23]);
  });

  it('agrees on a long random session of edits and caret moves', () => {
    let seed = 7;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const first = start();
    let host: { index: DocumentIndex; hold?: RangeOwner; caret?: number } = {
      index: first.index,
    };
    let page = first.layout;
    for (let step = 0; step < 400; step += 1) {
      const length = host.index.length;
      // Often continue at the caret (typing, backspace); sometimes jump.
      const caret = host.caret ?? 0;
      const at = random(3) === 0 ? random(length + 1) : Math.min(caret, length);
      const kind = random(3);
      const edit =
        kind === 0
          ? rep(at, at, 'x'.repeat(1 + random(3)))
          : kind === 1
            ? rep(Math.max(at - 1, 0), at, '')
            : rep(at, Math.min(at + random(4), length), 'Y');
      const after = edit.start + edit.inserted.length;
      host = hostStep(host, [edit], after);
      page = advanceLayout(page, [edit], after);
      expect(page.ends).toEqual(host.index.ranges.map((range) => range.end));
      expect(page.hold).toBe(ownerIndex(host.index, host.hold));
    }
  });
});
