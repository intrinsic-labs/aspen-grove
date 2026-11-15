import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';

const rail = loomUiTokens.continuationRail;

type ContinuationCardCaptionProps = {
  /** The model it came from (Latent Spaces' `modelId`). */
  readonly label: string;
  /** `[n]` for a saved card; a streaming card's state instead. */
  readonly detail: string;
  /**
   * The card the active path runs through: Latent Spaces checks the node's
   * remembered child, which Aspen Grove keeps as the active path.
   */
  readonly checked?: boolean;
  readonly detailTestID?: string;
  /** Trailing control (a streaming card's stop button). */
  readonly accessory?: ReactNode;
};

/**
 * The line above a continuation card: a green check on the card the path
 * runs through, the model in italic gray and `[n]` in secondary
 * (ChildNodeView.swift:20-33).
 */
export const ContinuationCardCaption = ({
  label,
  detail,
  checked = false,
  detailTestID,
  accessory,
}: ContinuationCardCaptionProps) => (
  <View style={styles.row}>
    {checked ? (
      <Ionicons
        testID="chat-continuation-card-check"
        name="checkmark-circle"
        size={rail.captionCheckSize}
        color={loomUiTokens.colors.green}
      />
    ) : null}
    <Text numberOfLines={1} style={[styles.text, styles.label]}>
      {label}
    </Text>
    <Text
      testID={detailTestID}
      numberOfLines={1}
      style={[styles.text, styles.detail]}
    >
      {detail}
    </Text>
    {accessory}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rail.captionItemGap,
    maxWidth: rail.cardWidth + rail.cardPadding * 2,
  },
  text: {
    fontSize: rail.captionTextSize,
    fontStyle: 'italic',
  },
  label: {
    color: rail.gray,
    flexShrink: 1,
  },
  detail: {
    color: rail.secondary,
    flexShrink: 0,
  },
});
