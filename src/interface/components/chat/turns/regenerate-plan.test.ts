import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import {
  countRowsKeptForRegenerate,
  findRegenerateSourceNodeId,
} from './regenerate-plan';

const id = (value: string) => value as ULID;

describe('findRegenerateSourceNodeId', () => {
  it('prefers the primary source of the first incoming edge', () => {
    expect(
      findRegenerateSourceNodeId([
        {
          sources: [
            { nodeId: id('context'), role: 'context' },
            { nodeId: id('primary'), role: 'primary' },
          ],
        },
        { sources: [{ nodeId: id('other'), role: 'primary' }] },
      ])
    ).toBe('primary');
  });

  it('falls back to the first source when none is primary', () => {
    expect(
      findRegenerateSourceNodeId([
        { sources: [{ nodeId: id('first'), role: 'context' }] },
      ])
    ).toBe('first');
  });

  it('is undefined with no incoming edge or no sources', () => {
    expect(findRegenerateSourceNodeId([])).toBeUndefined();
    expect(findRegenerateSourceNodeId([{ sources: [] }])).toBeUndefined();
  });
});

describe('countRowsKeptForRegenerate', () => {
  const rows = [
    { id: id('h1'), authorType: 'human' as const },
    { id: id('m1'), authorType: 'model' as const },
    { id: id('h2'), authorType: 'human' as const },
    { id: id('m2'), authorType: 'model' as const },
  ];

  it('drops a model row and everything after it', () => {
    expect(countRowsKeptForRegenerate(rows, id('m1'))).toBe(1);
    expect(countRowsKeptForRegenerate(rows, id('m2'))).toBe(3);
  });

  it('keeps a human row and drops what follows', () => {
    expect(countRowsKeptForRegenerate(rows, id('h1'))).toBe(1);
    expect(countRowsKeptForRegenerate(rows, id('h2'))).toBe(3);
  });

  it('is null when the target is not loaded', () => {
    expect(countRowsKeptForRegenerate(rows, id('missing'))).toBeNull();
  });
});
