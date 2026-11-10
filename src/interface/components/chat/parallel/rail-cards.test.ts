import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import type { ContinuationPreview } from '../types';
import type { ParallelSlotView } from './parallel-slots-state';
import { railCardKey, toRailCards } from './rail-cards';

const source = '01KSOURCE00000000000000000' as ULID;
const other = '01KOTHER000000000000000000' as ULID;

const preview = (nodeId: string): ContinuationPreview => ({
  nodeId: nodeId as ULID,
  localId: nodeId.slice(-4),
  previewText: `text ${nodeId}`,
  isOnActivePath: false,
  onBranchCount: 1,
  isBookmarked: false,
});
const slot = (
  index: number,
  extra: Partial<ParallelSlotView> = {}
): ParallelSlotView => ({
  slot: index,
  status: 'streaming',
  text: '',
  ...extra,
});

describe('toRailCards', () => {
  it('lists existing siblings, then one card per slot of a run from this node', () => {
    const cards = toRailCards(source, [preview('old1')], {
      sourceNodeId: source,
      slots: [slot(0), slot(1)],
    });

    expect(cards.map(railCardKey)).toEqual(['old1', 'slot-0', 'slot-1']);
  });

  it('shows a saved slot once, in its slot, with the reloaded preview', () => {
    const saved = preview('new0');
    const cards = toRailCards(source, [preview('old1'), saved], {
      sourceNodeId: source,
      slots: [slot(0, { status: 'cancelled', nodeId: saved.nodeId }), slot(1)],
    });

    expect(cards.map(railCardKey)).toEqual(['old1', 'slot-0', 'slot-1']);
    expect(cards[1]).toMatchObject({ kind: 'slot', preview: saved });
  });

  it('ignores a run from another node, or none', () => {
    const items = [preview('old1')];
    const run = { sourceNodeId: other, slots: [slot(0)] };

    expect(toRailCards(source, items, run).map(railCardKey)).toEqual(['old1']);
    expect(toRailCards(null, [], run)).toEqual([]);
    expect(toRailCards(source, items, { slots: [] }).map(railCardKey)).toEqual([
      'old1',
    ]);
  });
});
