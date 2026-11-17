import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, type TextStyle } from 'react-native';
import type { ULID } from '@domain/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { ContinuationMenuAction } from './continuation-menu';
import {
  countLiveSlots,
  railCardKey,
  type RailCard,
} from './parallel/rail-cards';
import { StreamingContinuationCard } from './parallel/StreamingContinuationCard';
import { SavedContinuationCard } from './SavedContinuationCard';
import { useOpenOnCurrentCard } from './useOpenOnCurrentCard';

const rail = loomUiTokens.continuationRail;

type ContinuationCardRowProps = {
  readonly cards: readonly RailCard[];
  readonly streamingModelLabel: string;
  readonly cardTextStyle: TextStyle;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly onStopSlot: (slot: number) => void;
};

/**
 * The rail's horizontal row of cards (`ScrollView(.horizontal)` in
 * ChildNodesView.swift). It opens centered on the current path's card and
 * brings a starting run's cards into view at its end.
 */
export const ContinuationCardRow = ({
  cards,
  streamingModelLabel,
  cardTextStyle,
  onSelect,
  onMenuAction,
  onStopSlot,
}: ContinuationCardRowProps) => {
  const listRef = useRef<ScrollView>(null);
  const liveSlotCount = countLiveSlots(cards);
  const shownLiveSlotCountRef = useRef(0);
  const { onLayout, onContentSizeChange } = useOpenOnCurrentCard(
    listRef,
    cards,
    liveSlotCount > 0
  );

  // New streaming cards join the end of the row: bring them into view
  // whenever a run starts, including a second run whose finished cards
  // are still showing (the slot count alone doesn't change then).
  useEffect(() => {
    if (liveSlotCount > shownLiveSlotCountRef.current) {
      listRef.current?.scrollToEnd({ animated: true });
    }
    shownLiveSlotCountRef.current = liveSlotCount;
  }, [liveSlotCount]);

  return (
    <ScrollView
      ref={listRef}
      testID="chat-continuation-rail-list"
      horizontal
      showsHorizontalScrollIndicator
      style={styles.list}
      contentContainerStyle={styles.content}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
    >
      {cards.map((card) =>
        card.kind === 'saved' ? (
          <SavedContinuationCard
            key={railCardKey(card)}
            item={card.preview}
            textStyle={cardTextStyle}
            onSelect={onSelect}
            onMenuAction={onMenuAction}
          />
        ) : (
          <StreamingContinuationCard
            key={railCardKey(card)}
            view={card.view}
            preview={card.preview}
            modelLabel={streamingModelLabel}
            textStyle={cardTextStyle}
            onStop={onStopSlot}
            onSelect={onSelect}
            onMenuAction={onMenuAction}
          />
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    marginBottom: rail.rowBottomPadding,
  },
  content: {
    padding: rail.rowPadding,
    gap: rail.cardSpacing,
    alignItems: 'flex-start',
  },
});
