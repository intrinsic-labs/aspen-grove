import { StyleSheet } from 'react-native';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';

const rail = loomUiTokens.continuationRail;

/** The card and its text, shared by saved and streaming continuations. */
export const continuationCardStyles = StyleSheet.create({
  // Caption over card, centered (`VStack(spacing: 8)`).
  column: {
    alignItems: 'center',
    gap: rail.captionGap,
  },
  // The text's 275 pt frame in `.padding(8)`, as tall as its text.
  card: {
    width: rail.cardWidth + rail.cardPadding * 2,
    padding: rail.cardPadding,
    borderRadius: rail.cardRadius,
    backgroundColor: rail.cardFill,
  },
  cardText: {
    color: rail.cardText,
  },
  failedCard: {
    opacity: rail.failedOpacity,
  },
  quietText: {
    opacity: 0.6,
  },
});
