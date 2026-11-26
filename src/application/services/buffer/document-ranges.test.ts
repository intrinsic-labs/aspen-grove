import { describe, expect, it } from '@jest/globals';
import {
  TAIL_OWNER,
  materialize,
  ownerAt,
  rangeOf,
  sliceDocument,
} from './document-ranges';
import { human, indexOf, model, passage } from './document-fixtures';

const A = { kind: 'passage', id: 'a' } as const;
const Z = { kind: 'passage', id: 'z' } as const;
const B = { kind: 'passage', id: 'b' } as const;

// "Hello " | "" | "world" | tail "!"
const layout = () =>
  indexOf(
    [passage('a', human('Hello ')), passage('z'), passage('b', model('world'))],
    human('!')
  );

describe('indexing', () => {
  it('gives every passage and the tail a contiguous half-open range', () => {
    const index = layout();
    expect(index.ranges.map((r) => [r.start, r.end])).toEqual([
      [0, 6],
      [6, 6],
      [6, 11],
      [11, 12],
    ]);
    expect(index.ranges.map((r) => r.owner)).toEqual([A, Z, B, TAIL_OWNER]);
    expect(index.length).toBe(12);
  });

  it('counts UTF-16 units, not characters', () => {
    const index = indexOf([passage('a', human('a😀'))]);
    expect(index.length).toBe(3);
  });

  it('keeps an empty document with a zero-width tail', () => {
    const index = indexOf([]);
    expect(index.ranges).toEqual([{ owner: TAIL_OWNER, start: 0, end: 0 }]);
  });
});

describe('owner lookup', () => {
  it('finds the passage that contains an offset', () => {
    expect(ownerAt(layout(), 3).owner).toEqual(A);
    expect(ownerAt(layout(), 8).owner).toEqual(B);
  });

  it('gives a seam to the right-hand node, skipping a zero-width one', () => {
    expect(ownerAt(layout(), 6).owner).toEqual(B);
  });

  it('gives the end of the document to the tail', () => {
    expect(ownerAt(layout(), 12).owner).toEqual(TAIL_OWNER);
    expect(ownerAt(layout(), 99).owner).toEqual(TAIL_OWNER);
    expect(ownerAt(indexOf([passage('a', human('x'))]), 1).owner).toEqual(
      TAIL_OWNER
    );
  });

  it('gives the start of the document to the first passage with text', () => {
    expect(ownerAt(layout(), 0).owner).toEqual(A);
    expect(ownerAt(layout(), -4).owner).toEqual(A);
  });

  it('keeps left affinity at a seam while held, including a zero-width node', () => {
    expect(ownerAt(layout(), 6, A).owner).toEqual(A);
    expect(ownerAt(layout(), 6, Z).owner).toEqual(Z);
    expect(ownerAt(layout(), 11, B).owner).toEqual(B);
  });

  it('ignores a hold whose range no longer reaches the offset', () => {
    expect(ownerAt(layout(), 8, A).owner).toEqual(B);
    expect(ownerAt(layout(), 6, { kind: 'passage', id: 'gone' }).owner).toEqual(
      B
    );
  });

  it('finds a range by owner', () => {
    expect(rangeOf(layout(), B)).toEqual({ owner: B, start: 6, end: 11 });
    expect(rangeOf(layout(), { kind: 'passage', id: 'gone' })).toBeUndefined();
  });
});

describe('slice and materialize', () => {
  it('slices across owners and coalesces matching neighbours', () => {
    expect(sliceDocument(layout(), 3, 8)).toEqual([human('lo '), model('wo')]);
    expect(
      sliceDocument(
        indexOf([passage('a', human('ab')), passage('b', human('cd'))]),
        1,
        3
      )
    ).toEqual([human('bc')]);
  });

  it('materializes the full text and runs', () => {
    expect(materialize(layout())).toEqual({
      text: 'Hello world!',
      runs: [human('Hello '), model('world'), human('!')],
    });
  });

  it('materializes an empty document', () => {
    expect(materialize(indexOf([]))).toEqual({ text: '', runs: [] });
  });
});
