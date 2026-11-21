import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { RailCard } from './parallel/rail-cards';

const rail = loomUiTokens.continuationRail;

/** Every card's column is the card's width: its caption is capped to it. */
const cardColumnWidth = rail.cardWidth + rail.cardPadding * 2;

const isOnActivePath = (card: RailCard): boolean =>
  card.kind === 'saved'
    ? card.preview.isOnActivePath
    : card.preview?.isOnActivePath === true;

/**
 * The card the rail opens on: the continuation the active path runs
 * through (the one with the green check), else the first. A node at the
 * end of the path has none on it, so its rail opens at the start.
 */
export const currentRailCardIndex = (cards: readonly RailCard[]): number =>
  Math.max(0, cards.findIndex(isOnActivePath));

export type RailCardOffsetInput = {
  readonly index: number;
  /** The rail's visible width. */
  readonly viewportWidth: number;
  /** The row's full width, its padding included. */
  readonly contentWidth: number;
};

/**
 * The horizontal offset that centers card `index` in the rail, kept within
 * what the row can scroll: the first card stays at the row's start and the
 * last at its end, each with the row's 16 pt margin.
 */
export const centeredRailCardOffset = ({
  index,
  viewportWidth,
  contentWidth,
}: RailCardOffsetInput): number => {
  const cardStart =
    rail.rowPadding + index * (cardColumnWidth + rail.cardSpacing);
  const target = cardStart + cardColumnWidth / 2 - viewportWidth / 2;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  return Math.min(maxOffset, Math.max(0, target));
};
