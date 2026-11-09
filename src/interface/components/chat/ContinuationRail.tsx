import { memo, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { ContinuationMenuAction } from './continuation-menu';
import {
  ContinuationGenerateControl,
  type ContinuationGenerateControlProps,
} from './parallel/ContinuationGenerateControl';
import { railCardKey, type RailCard } from './parallel/rail-cards';
import { StreamingContinuationCard } from './parallel/StreamingContinuationCard';
import { SavedContinuationCard } from './SavedContinuationCard';

type ContinuationRailProps = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly sourceLocalId?: string;
  readonly cards: readonly RailCard[];
  readonly generation: ContinuationGenerateControlProps;
  readonly previewFontFamily?: string;
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly onStopSlot: (slot: number) => void;
};

const countSlots = (cards: readonly RailCard[]) =>
  cards.filter((card) => card.kind === 'slot').length;

export const ContinuationRail = memo(
  ({
    visible,
    loading,
    sourceLocalId,
    cards,
    generation,
    previewFontFamily,
    error,
    onSelect,
    onMenuAction,
    onStopSlot,
  }: ContinuationRailProps) => {
    const { colors } = useAspenGroveTheme();
    const listRef = useRef<ScrollView>(null);
    const slotCount = countSlots(cards);

    // New streaming cards join the end of the row: bring them into view.
    useEffect(() => {
      if (slotCount > 0) {
        listRef.current?.scrollToEnd({ animated: true });
      }
    }, [slotCount]);

    if (!visible) {
      return null;
    }

    const showList = cards.length > 0 && (!loading || slotCount > 0);

    return (
      <View
        testID="chat-continuation-rail"
        style={[
          styles.wrap,
          {
            borderTopColor: colors.line,
            borderBottomColor: colors.line,
          },
        ]}
      >
        <View style={styles.header}>
          <AppText variant="meta" tone="secondary" style={styles.headerTitle}>
            {sourceLocalId
              ? `Continuations for ${sourceLocalId}`
              : 'Continuations'}
          </AppText>
        </View>

        <ContinuationGenerateControl {...generation} />

        {showList ? (
          <>
            <ScrollView
              ref={listRef}
              testID="chat-continuation-rail-list"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {cards.map((card) =>
                card.kind === 'saved' ? (
                  <SavedContinuationCard
                    key={railCardKey(card)}
                    item={card.preview}
                    previewFontFamily={previewFontFamily}
                    onSelect={onSelect}
                    onMenuAction={onMenuAction}
                  />
                ) : (
                  <StreamingContinuationCard
                    key={railCardKey(card)}
                    view={card.view}
                    preview={card.preview}
                    previewFontFamily={previewFontFamily}
                    onStop={onStopSlot}
                    onSelect={onSelect}
                    onMenuAction={onMenuAction}
                  />
                )
              )}
            </ScrollView>
            <AppText variant="meta" tone="muted" style={styles.hintText}>
              Tap for details. Double tap to retrace branch. Long press for
              options.
            </AppText>
          </>
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
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: loomUiTokens.continuationRail.verticalPadding,
    paddingBottom: loomUiTokens.continuationRail.verticalPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.headerVerticalPadding,
    marginBottom: loomUiTokens.continuationRail.headerBottomMargin,
  },
  headerTitle: {
    letterSpacing: loomUiTokens.continuationRail.headerLetterSpacing,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  hintText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.hintVerticalPadding,
    marginTop: loomUiTokens.continuationRail.hintTopMargin,
    textAlign: 'center',
  },
  emptyText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.emptyVerticalPadding,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    gap: loomUiTokens.continuationRail.contentGap,
  },
});
