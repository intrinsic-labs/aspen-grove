import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import type { RailCard } from './parallel/rail-cards';
import {
  centeredRailCardOffset,
  currentRailCardIndex,
} from './rail-card-centering';
import type { ContinuationPreview } from './types';

const preview = (
  nodeId: string,
  isOnActivePath = false
): ContinuationPreview => ({
  nodeId: nodeId as ULID,
  localId: nodeId,
  modelLabel: 'mock-model',
  previewText: nodeId,
  isOnActivePath,
  onBranchCount: 1,
  isBookmarked: false,
});
const saved = (nodeId: string, onPath = false): RailCard => ({
  kind: 'saved',
  preview: preview(nodeId, onPath),
});

// 16 pt row padding, 291 pt cards (275 + 2 × 8) 22 pt apart.
const card = 291;
const step = card + 22;
const rowWidth = (count: number) => 16 * 2 + count * card + (count - 1) * 22;

describe('currentRailCardIndex', () => {
  it('opens on the card the active path runs through', () => {
    expect(
      currentRailCardIndex([saved('a'), saved('b'), saved('c', true)])
    ).toBe(2);
  });

  it('opens on the first card when none is on the path', () => {
    expect(currentRailCardIndex([saved('a'), saved('b')])).toBe(0);
    expect(currentRailCardIndex([])).toBe(0);
  });

  it('finds a saved run card that is on the path', () => {
    const slotCard: RailCard = {
      kind: 'slot',
      view: { slot: 0, status: 'done', text: 'x', nodeId: 'b' as ULID },
      preview: preview('b', true),
    };
    expect(currentRailCardIndex([saved('a'), slotCard])).toBe(1);
  });
});

describe('centeredRailCardOffset', () => {
  const viewportWidth = 402;

  it('centers a middle card in the rail', () => {
    const offset = centeredRailCardOffset({
      index: 2,
      viewportWidth,
      contentWidth: rowWidth(5),
    });
    expect(offset).toBe(16 + 2 * step + card / 2 - viewportWidth / 2);
  });

  it('keeps the first card at the row start', () => {
    expect(
      centeredRailCardOffset({
        index: 0,
        viewportWidth,
        contentWidth: rowWidth(3),
      })
    ).toBe(0);
  });

  it('stops at the row end for the last card', () => {
    expect(
      centeredRailCardOffset({
        index: 3,
        viewportWidth,
        contentWidth: rowWidth(4),
      })
    ).toBe(rowWidth(4) - viewportWidth);
  });

  it('does not scroll a row narrower than the rail', () => {
    expect(
      centeredRailCardOffset({
        index: 0,
        viewportWidth: 1024,
        contentWidth: rowWidth(2),
      })
    ).toBe(0);
  });
});
