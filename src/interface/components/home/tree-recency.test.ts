import type { LoomTree } from '@domain/entities';
import { byRecency, treeLastUsed, treeRowDateText } from './tree-recency';

const tree = (id: string, updatedAt: Date, lastMessageAt?: Date) =>
  ({ id, updatedAt, lastMessageAt }) as unknown as LoomTree;

describe('tree recency', () => {
  it('prefers the last message over the last edit', () => {
    const updated = new Date(2026, 0, 1);
    const messaged = new Date(2026, 0, 2);
    expect(treeLastUsed(tree('a', updated, messaged))).toBe(messaged);
    expect(treeLastUsed(tree('b', updated))).toBe(updated);
  });

  it('sorts the most recent first', () => {
    const older = tree('older', new Date(2026, 0, 1));
    const newer = tree('newer', new Date(2025, 0, 1), new Date(2026, 0, 3));
    expect([older, newer].sort(byRecency).map((t) => t.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('formats like Date.formatted()', () => {
    expect(
      treeRowDateText(new Date(2025, 2, 4, 14, 1), 'en-US').replace(/\s/g, ' ')
    ).toBe('3/4/2025, 2:01 PM');
  });
});
