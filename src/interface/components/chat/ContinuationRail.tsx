import { memo } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { ContinuationMenuAction } from './continuation-menu';
import {
  ContinuationGenerateControl,
  type ContinuationGenerateControlProps,
} from './parallel/ContinuationGenerateControl';
import { ContinuationCardRow } from './ContinuationCardRow';
import type { RailCard } from './parallel/rail-cards';

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
 * cards of a run stream into the row's end (`ContinuationCardRow`).
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
    const slotCount = countSlots(cards);

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
          <ContinuationCardRow
            cards={cards}
            streamingModelLabel={streamingModelLabel}
            cardTextStyle={cardTextStyle}
            onSelect={onSelect}
            onMenuAction={onMenuAction}
            onStopSlot={onStopSlot}
          />
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
