import { fonts } from '@interface/ui/value-objects/fonts';
import { StyleSheet, View } from 'react-native';
import CodeHighlighter from 'react-native-code-highlighter';
import { codepenEmbed } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import {
  CODE_LINE_HEIGHT,
  codeBlockHeight,
  withoutTrailingNewline,
} from './code-block-height';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type CodeBlockProps = {
  readonly code: string;
  readonly language: string;
  /** The message's code face (`codeFace`); JetBrains Mono when unset. */
  readonly fontFamily?: string;
};

/**
 * A code block, syntax highlighted, that scrolls sideways instead of
 * wrapping, without a scroll bar (as in Latent Spaces). Its height is set
 * from the line count up front, so the message doesn't jump when the
 * highlighter lays out. The space around it is the body rule's.
 */
export const CodeBlock = ({ code, language, fontFamily }: CodeBlockProps) => {
  const shown = withoutTrailingNewline(code);
  const estimatedHeight = codeBlockHeight(shown);

  return (
    <View
      testID={`markdown-code-block-${language}`}
      style={[styles.container, { height: estimatedHeight }]}
    >
      <CodeHighlighter
        hljsStyle={codepenEmbed}
        language={language}
        scrollViewProps={scrollViewProps}
        textStyle={fontFamily === fonts.vt220 ? vt220Text : styles.text}
      >
        {shown}
      </CodeHighlighter>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: loomUiTokens.markdown.codeBlockBackground,
  },
  scrollView: {
    backgroundColor: loomUiTokens.markdown.codeBlockBackground,
    borderRadius: 0,
  },
  scrollContent: {
    backgroundColor: loomUiTokens.markdown.codeBlockBackground,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 24, // extra padding so code doesn't touch edge when scrolled
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: CODE_LINE_HEIGHT,
  },
});

// VT220 draws two points up, as in messages; the line height (and so the
// up-front height estimate) stays the same.
const vt220Text = StyleSheet.flatten([
  styles.text,
  { fontFamily: fonts.vt220, fontSize: styles.text.fontSize + 2 },
]);

const scrollViewProps = {
  style: styles.scrollView,
  contentContainerStyle: styles.scrollContent,
  nestedScrollEnabled: true,
  showsHorizontalScrollIndicator: false,
};
