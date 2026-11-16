import { StyleSheet, type TextStyle, View } from 'react-native';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { MarkdownText } from '../MarkdownText';

type StreamingMessageProps = {
  readonly text: string;
  readonly textStyle: TextStyle;
};

/** The reply still streaming in, below the path's saved rows. */
export const StreamingMessage = ({
  text,
  textStyle,
}: StreamingMessageProps) => (
  <View testID="chat-streaming-message" style={styles.streamingRow}>
    <MarkdownText baseStyle={textStyle} transient>
      {text}
    </MarkdownText>
  </View>
);

const styles = StyleSheet.create({
  streamingRow: {
    width: '100%',
    alignItems: 'flex-start',
    padding: loomUiTokens.messageList.messagePadding,
    paddingRight:
      loomUiTokens.messageList.messagePadding +
      loomUiTokens.messageList.modelRowTrailingInset,
  },
});
