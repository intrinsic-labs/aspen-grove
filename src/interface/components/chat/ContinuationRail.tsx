import { memo, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { ContinuationMenuAction } from './continuation-menu';
import {
  ContinuationGenerateControl,
  type ContinuationGenerateControlProps,
} from './parallel/ContinuationGenerateControl';
import {
  countLiveSlots,
  railCardKey,
  type RailCard,
} from './parallel/rail-cards';
import { StreamingContinuationCard } from './parallel/StreamingContinuationCard';
import { SavedContinuationCard } from './SavedContinuationCard';

const rail = loomUiTokens.continuationRail;

type ContinuationRailProps = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly cards: readonly RailCard[];
  readonly generation: ContinuationGenerateControlProps;
  /** The model a run streams from, captioning its cards until they save. */
  readonly streamingModelLabel: string;
  /** The message text's font and size, which the cards set their text in. */
  readonly cardTextStyle: TextStyle;
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly onStopSlot: (slot: number) => void;
};

const countSlots = (cards: readonly RailCard[]) =>
  cards.filter((card) => card.kind === 'slot').length;

/**
 * A node's continuations, as Latent Spaces lays them out under the node
 * (ChildNodesView.swift): the gesture hint, a horizontal row of cards, and
 * a divider. Aspen Grove adds its generate control under the hint, and the
 * cards of a run stream into the row's end.
 */
export const ContinuationRail = memo(
  ({
    visible,
    loading,
    cards,
    generation,
    streamingModelLabel,
    cardTextStyle,
    error,
    onSelect,
    onMenuAction,
    onStopSlot,
  }: ContinuationRailProps) => {
    const listRef = useRef<ScrollView>(null);
    const slotCount = countSlots(cards);
    const liveSlotCount = countLiveSlots(cards);
    const shownLiveSlotCountRef = useRef(0);

    // New streaming cards join the end of the row: bring them into view
    // whenever a run starts, including a second run whose finished cards
    // are still showing (the slot count alone doesn't change then).
    useEffect(() => {
      if (liveSlotCount > shownLiveSlotCountRef.current) {
        listRef.current?.scrollToEnd({ animated: true });
      }
      shownLiveSlotCountRef.current = liveSlotCount;
    }, [liveSlotCount]);

    if (!visible) {
      return null;
    }

    const showList = cards.length > 0 && (!loading || slotCount > 0);

    return (
      <View testID="chat-continuation-rail" style={styles.wrap}>
        <Text testID="chat-continuation-rail-hint" style={styles.hint}>
          Tap to expand. Double tap to make current node. Long press for more
          options.
        </Text>

        <ContinuationGenerateControl {...generation} />

        {showList ? (
          <ScrollView
            ref={listRef}
            testID="chat-continuation-rail-list"
            horizontal
            showsHorizontalScrollIndicator
            style={styles.list}
            contentContainerStyle={styles.content}
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
        ) : loading ? (
          <AppText
            testID="chat-continuation-rail-loading"
            variant="meta"
            tone="muted"
            style={styles.emptyText}
          >
            Loading continuations...
          </AppText>
        ) : error ? (
          <AppText
            testID="chat-continuation-rail-error"
            variant="meta"
            tone="accent"
            style={styles.emptyText}
          >
            {error}
          </AppText>
        ) : (
          <AppText
            testID="chat-continuation-rail-empty"
            variant="meta"
            tone="muted"
            style={styles.emptyText}
          >
            No continuations yet.
          </AppText>
        )}

        <View style={styles.divider} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'stretch',
  },
  hint: {
    fontFamily: rail.hintFontFamily,
    fontSize: rail.hintTextSize,
    lineHeight: rail.hintLineHeight,
    color: rail.gray,
    textAlign: 'center',
    paddingTop: rail.hintPadding,
    paddingHorizontal: rail.hintPadding,
  },
  list: {
    marginBottom: rail.rowBottomPadding,
  },
  content: {
    padding: rail.rowPadding,
    gap: rail.cardSpacing,
    alignItems: 'flex-start',
  },
  emptyText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: rail.emptyVerticalPadding,
    marginBottom: rail.rowBottomPadding,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: loomUiTokens.settingsForm.colors.separator,
    marginBottom: rail.dividerBottomMargin,
  },
});
