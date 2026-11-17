import { StyleSheet, View } from 'react-native';
import CodeHighlighter from 'react-native-code-highlighter';
import { codepenEmbed } from 'react-syntax-highlighter/dist/esm/styles/hljs';

/** Matches `styles.text.lineHeight`. */
const CODE_LINE_HEIGHT = 20;
/** `scrollContent`'s top and bottom padding. */
const CODE_VERTICAL_CHROME = 12 + 12;

type CodeBlockProps = {
  readonly code: string;
  readonly language: string;
};

/**
 * A code block, syntax highlighted, that scrolls sideways instead of
 * wrapping, without a scroll bar (as in Latent Spaces). Its height is set
 * from the line count up front, so the message doesn't jump when the
 * highlighter lays out. The space around it is the body rule's.
 */
export const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const lineCount = code.split('\n').length;
  const estimatedHeight = lineCount * CODE_LINE_HEIGHT + CODE_VERTICAL_CHROME;

  return (
    <View style={[styles.container, { height: estimatedHeight }]}>
      <CodeHighlighter
        hljsStyle={codepenEmbed}
        language={language}
        scrollViewProps={scrollViewProps}
        textStyle={styles.text}
      >
        {code.replace(/\n$/, '')}
      </CodeHighlighter>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scrollView: {
    backgroundColor: '#000',
    borderRadius: 0,
  },
  scrollContent: {
    backgroundColor: '#000',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 24, // extra padding so code doesn't touch edge when scrolled
  },
  text: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
    lineHeight: CODE_LINE_HEIGHT,
  },
});

const scrollViewProps = {
  style: styles.scrollView,
  contentContainerStyle: styles.scrollContent,
  nestedScrollEnabled: true,
  showsHorizontalScrollIndicator: false,
};
