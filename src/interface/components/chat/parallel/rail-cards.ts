import type { ULID } from '@domain/value-objects';
import type { ContinuationPreview } from '../types';
import type { ParallelSlotView } from './parallel-slots-state';

/** One card in the continuation rail. */
export type RailCard =
  | { readonly kind: 'saved'; readonly preview: ContinuationPreview }
  | {
      readonly kind: 'slot';
      readonly view: ParallelSlotView;
      /** The saved node's preview, once this slot has saved one and the rail reloaded. */
      readonly preview?: ContinuationPreview;
    };

type RunForRail = {
  readonly sourceNodeId?: ULID;
  readonly slots: readonly ParallelSlotView[];
};

/**
 * The rail's cards: a node's existing continuations, then, when the current
 * run started from that same node, one card per slot in slot order. A slot
 * that has saved its node replaces that node's ordinary card, so a result
 * shows once, in its slot, keeping its state (stopped, interrupted).
 */
export const toRailCards = (
  railSourceNodeId: ULID | null,
  items: readonly ContinuationPreview[],
  run: RunForRail
): readonly RailCard[] => {
  const runIsHere =
    railSourceNodeId !== null &&
    run.sourceNodeId === railSourceNodeId &&
    run.slots.length > 0;
  if (!runIsHere) {
    return items.map((preview) => ({ kind: 'saved', preview }));
  }

  const byNodeId = new Map(items.map((item) => [item.nodeId, item]));
  const slotNodeIds = new Set(
    run.slots.flatMap((view) => (view.nodeId ? [view.nodeId] : []))
  );
  const saved: RailCard[] = items
    .filter((item) => !slotNodeIds.has(item.nodeId))
    .map((preview) => ({ kind: 'saved', preview }));
  const slots: RailCard[] = run.slots.map((view) => ({
    kind: 'slot',
    view,
    preview: view.nodeId ? byNodeId.get(view.nodeId) : undefined,
  }));
  return [...saved, ...slots];
};

/** A key per card, stable while a slot moves from streaming to saved. */
export const railCardKey = (card: RailCard): string =>
  card.kind === 'saved' ? card.preview.nodeId : `slot-${card.view.slot}`;
