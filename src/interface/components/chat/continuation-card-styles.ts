import { StyleSheet } from 'react-native';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';

/** Text and meta styles shared by saved and streaming continuation cards. */
export const continuationCardStyles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLine: {
    letterSpacing: loomUiTokens.continuationRail.metaLetterSpacing,
  },
  cardText: {
    color: '#000',
  },
  previewText: {
    fontSize: loomUiTokens.continuationRail.previewTextSize,
    lineHeight: loomUiTokens.continuationRail.previewTextLineHeight,
  },
});
