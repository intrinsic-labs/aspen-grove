import { memo, useCallback, useEffect, useState } from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
  type TextLayoutEventData,
  View,
} from 'react-native';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';

type UserBubbleProps = {
  readonly text: string;
  readonly cornerRadius: number;
  readonly viewStyle: 'filled' | 'outlined';
  readonly messageTextStyle: object;
  /** Voice Mode: the text takes the reading voice's color. */
  readonly speakingColor?: string;
};

/** A human turn: a bubble sized to its longest line. */
export const UserBubble = memo(
  ({
    text,
    cornerRadius,
    viewStyle,
    messageTextStyle,
    speakingColor,
  }: UserBubbleProps) => {
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

    // Re-measure from scratch whenever the text or style changes — a width
    // measured under one style is invalid under the other (see below).
    useEffect(() => {
      setMeasuredWidth(null);
    }, [text, viewStyle]);

    const onTextLayout = useCallback(
      (event: NativeSyntheticEvent<TextLayoutEventData>) => {
        const { lines } = event.nativeEvent;
        if (lines.length === 0) return;

        // Find the maximum line width
        const maxLineWidth = Math.max(...lines.map((line) => line.width));

        // RN draws borders INSIDE the box width, so the outlined style must
        // budget for them or the text's content box comes up 2×border too
        // narrow, re-wraps, re-measures smaller, and the bubble collapses in
        // a feedback loop. Ceil to avoid fractional-width boundary re-wraps.
        const borderAllowance =
          viewStyle === 'outlined'
            ? loomUiTokens.messageList.userBubbleOutlineWidth * 2
            : 0;
        const bubbleWidth = Math.ceil(
          maxLineWidth +
            loomUiTokens.messageList.userBubblePaddingHorizontal * 2 +
            borderAllowance
        );

        // Ignore sub-pixel remeasurements so no styling change can ever
        // re-open the measure → re-wrap → measure oscillation.
        setMeasuredWidth((current) =>
          current !== null && Math.abs(current - bubbleWidth) <= 1
            ? current
            : bubbleWidth
        );
      },
      [viewStyle]
    );

    return (
      <View style={styles.userBubbleWrapper}>
        <View
          style={[
            styles.userBubble,
            {
              borderRadius: cornerRadius,
              // Apply measured width if available
              ...(measuredWidth !== null && { width: measuredWidth }),
            },
            viewStyle === 'filled'
              ? {
                  backgroundColor: loomUiTokens.colors.userBubbleFill,
                  borderWidth: 0,
                }
              : {
                  backgroundColor: 'transparent',
                  borderColor: loomUiTokens.colors.userBubbleOutline,
                  borderWidth: loomUiTokens.messageList.userBubbleOutlineWidth,
                },
          ]}
        >
          <AppText
            variant="body"
            tone={viewStyle === 'filled' ? 'inverse' : 'primary'}
            onTextLayout={onTextLayout}
            style={[
              styles.messageText,
              messageTextStyle,
              viewStyle === 'filled'
                ? styles.userFilledText
                : styles.standardText,
              speakingColor ? { color: speakingColor, opacity: 1 } : null,
            ]}
          >
            {text}
          </AppText>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  userBubbleWrapper: {
    maxWidth: '100%',
    alignItems: 'flex-end',
  },
  userBubble: {
    alignSelf: 'flex-end',
    paddingHorizontal: loomUiTokens.messageList.userBubblePaddingHorizontal,
    paddingVertical: loomUiTokens.messageList.userBubblePaddingVertical,
  },
  standardText: {
    opacity: loomUiTokens.messageList.messageTextOpacity,
  },
  userFilledText: {
    color: loomUiTokens.colors.userBubbleFillText,
    opacity: loomUiTokens.messageList.messageTextOpacity,
  },
  messageText: {
    fontSize: loomUiTokens.messageList.textSize,
    lineHeight: loomUiTokens.messageList.textLineHeight,
  },
});
