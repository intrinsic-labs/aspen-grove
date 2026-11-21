import { useMemo } from 'react';
import { StyleSheet, type TextStyle, View } from 'react-native';
import type { NodeAuthorType } from '@domain/entities';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { MarkdownText } from '../MarkdownText';

const SHEET_TEXT_COLOR = loomUiTokens.colors.primary;

type NodeSheetTextProps = {
  readonly text: string;
  readonly authorType: NodeAuthorType;
  /** The message text's font and size (Latent Spaces' loom font). */
  readonly textStyle: TextStyle;
};

/**
 * A node's whole text in its sheet, drawn as its message is in the tree (as
 * Latent Spaces' sheets reuse its message view): a model's reply as
 * rendered markdown, a human or system message as typed. Selectable.
 */
export const NodeSheetText = ({
  text,
  authorType,
  textStyle,
}: NodeSheetTextProps) => {
  const markdownStyle = useMemo<TextStyle>(
    () => ({ ...textStyle, color: SHEET_TEXT_COLOR }),
    [textStyle]
  );

  if (authorType !== 'model') {
    return (
      <AppText
        testID="node-sheet-text"
        variant="body"
        selectable
        style={[textStyle, styles.plain, styles.inset]}
      >
        {text}
      </AppText>
    );
  }
  return (
    <View testID="node-sheet-text" style={styles.inset}>
      <MarkdownText baseStyle={markdownStyle} selectable>
        {text}
      </MarkdownText>
    </View>
  );
};

const styles = StyleSheet.create({
  plain: {
    color: SHEET_TEXT_COLOR,
  },
  inset: {
    paddingHorizontal: loomUiTokens.nodeSheet.textInset,
  },
});
