import { memo } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';

type SystemMessageProps = {
  readonly text: string;
  readonly messageTextStyle: TextStyle;
  /** Voice Mode: the text takes the reading voice's color. */
  readonly speakingColor?: string;
};

/**
 * A system node, as Latent Spaces draws one: centered plain text in the
 * message font at 0.6 opacity, no bubble (NodeView.swift:33,42-43,193-203).
 */
export const SystemMessage = memo(
  ({ text, messageTextStyle, speakingColor }: SystemMessageProps) => (
    <AppText
      variant="body"
      tone="primary"
      style={[
        messageTextStyle,
        styles.text,
        speakingColor ? { color: speakingColor, opacity: 1 } : null,
      ]}
    >
      {text}
    </AppText>
  )
);

const styles = StyleSheet.create({
  text: {
    opacity: loomUiTokens.messageList.systemTextOpacity,
  },
});
