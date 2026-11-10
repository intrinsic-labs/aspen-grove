import type { ULID } from '@domain/value-objects';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { ContinuationGenerateControlProps } from '../parallel/ContinuationGenerateControl';
import type { RailCard } from '../parallel/rail-cards';

export type ContinuationRailState = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly sourceNodeId: ULID | null;
  readonly sourceLocalId?: string;
  /** Existing siblings, then the cards of a run started from this node. */
  readonly cards: readonly RailCard[];
  readonly generation: ContinuationGenerateControlProps;
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly onStopSlot: (slot: number) => void;
};
