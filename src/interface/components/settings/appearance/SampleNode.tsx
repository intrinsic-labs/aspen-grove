import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import type { NodeViewStyle } from '@domain/entities';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const preview = loomUiTokens.settingsPreview;
const { colors, messageList } = loomUiTokens;

type SampleNodeProps = {
  readonly text: string;
  readonly author: 'user' | 'model';
  readonly textStyle: TextStyle;
  readonly nodeViewStyle: NodeViewStyle;
  readonly cornerRadius: number;
};

/**
 * One message of the settings preview (Latent Spaces' `SampleNodeView`):
 * model text plain and full width, user text in a filled or outlined
 * bubble after a 65 pt spacer.
 */
export const SampleNode = ({
  text,
  author,
  textStyle,
  nodeViewStyle,
  cornerRadius,
}: SampleNodeProps) => {
  if (author === 'model') {
    return (
      <View style={styles.modelRow}>
        <Text style={[textStyle, styles.text]}>{text}</Text>
      </View>
    );
  }

  const filled = nodeViewStyle === 'filled';
  return (
    <View style={styles.userRow}>
      <View
        style={[
          styles.bubble,
          { borderRadius: cornerRadius },
          filled
            ? { backgroundColor: colors.userBubbleFill }
            : {
                borderWidth: messageList.userBubbleOutlineWidth,
                borderColor: colors.userBubbleOutline,
              },
        ]}
      >
        <Text style={[textStyle, styles.text]}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modelRow: {
    paddingHorizontal: preview.rowInset,
    alignItems: 'flex-start',
  },
  userRow: {
    paddingLeft: preview.userLeadingInset + preview.rowInset,
    paddingRight: preview.rowInset,
    alignItems: 'flex-end',
  },
  bubble: {
    padding: preview.bubblePadding,
  },
  text: {
    color: '#FFFFFF',
    opacity: messageList.messageTextOpacity,
  },
});
