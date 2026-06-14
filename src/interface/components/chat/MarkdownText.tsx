import { memo, useMemo } from 'react';
import { StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native';
import CodeHighlighter from 'react-native-code-highlighter';
import Markdown, { type RenderRules } from 'react-native-markdown-display';
import { codepenEmbed } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useAspenGroveTheme } from '../../hooks/useAspenGroveTheme';

// Extract background color from theme to apply to ScrollView
const CODE_BLOCK_BACKGROUND =
  (codepenEmbed.hljs?.background as string) ?? 'transparent';

type MarkdownTextProps = {
  readonly children: string;
  readonly baseStyle?: TextStyle;
};

/**
 * Renders markdown content using native components.
 * Styled to match Aspen Grove's typography and theme.
 */
export const MarkdownText = memo(
  ({ children, baseStyle }: MarkdownTextProps) => {
    const { colors } = useAspenGroveTheme();

    const styles = useMemo(() => {
      const fontFamily = baseStyle?.fontFamily ?? 'Cardo-Regular';
      const fontSize = baseStyle?.fontSize ?? 17;
      const lineHeight = baseStyle?.lineHeight ?? 27;
      const textColor = baseStyle?.color ?? colors.textColor;

      return {
        body: {
          fontFamily,
          fontSize,
          lineHeight,
          color: textColor,
        } as TextStyle,

        // Headings
        heading1: {
          fontFamily: 'Cardo-Bold',
          fontSize: fontSize * 1.6,
          lineHeight: lineHeight * 1.4,
          marginTop: 16,
          marginBottom: 8,
          color: textColor,
        } as TextStyle,
        heading2: {
          fontFamily: 'Cardo-Bold',
          fontSize: fontSize * 1.4,
          lineHeight: lineHeight * 1.3,
          marginTop: 14,
          marginBottom: 6,
          color: textColor,
        } as TextStyle,
        heading3: {
          fontFamily: 'Cardo-Bold',
          fontSize: fontSize * 1.2,
          lineHeight: lineHeight * 1.2,
          marginTop: 12,
          marginBottom: 4,
          color: textColor,
        } as TextStyle,
        heading4: {
          fontFamily: 'Cardo-Bold',
          fontSize: fontSize * 1.1,
          lineHeight: lineHeight * 1.1,
          marginTop: 10,
          marginBottom: 4,
          color: textColor,
        } as TextStyle,
        heading5: {
          fontFamily: 'Cardo-Bold',
          fontSize,
          lineHeight,
          marginTop: 8,
          marginBottom: 2,
          color: textColor,
        } as TextStyle,
        heading6: {
          fontFamily: 'Cardo-Bold',
          fontSize: fontSize * 0.9,
          lineHeight: lineHeight * 0.9,
          marginTop: 8,
          marginBottom: 2,
          color: textColor,
        } as TextStyle,

        // Emphasis
        strong: {
          fontFamily: 'Cardo-Bold',
        } as TextStyle,
        em: {
          fontFamily: 'Cardo-Italic',
        } as TextStyle,
        s: {
          textDecorationLine: 'line-through',
        } as TextStyle,

        // Code
        code_inline: {
          fontFamily: 'IBMPlexMono-Regular',
          fontSize: fontSize * 0.88,
          backgroundColor: colors.codeBackground,
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 4,
          borderWidth: 0,
          color: textColor,
        } as TextStyle,
        code_block: {
          fontFamily: 'IBMPlexMono-Regular',
          fontSize: fontSize * 0.85,
          lineHeight: lineHeight * 0.9,
          backgroundColor: 'red',
          padding: 0,
          borderRadius: 0,
          borderWidth: 0,
          marginVertical: 8,
          color: textColor,
        } as TextStyle,
        fence: {
          fontFamily: 'IBMPlexMono-Regular',
          fontSize: fontSize * 0.85,
          lineHeight: lineHeight * 0.9,
          backgroundColor: 'red',
          padding: 0,
          borderRadius: 0,
          borderWidth: 0,
          marginVertical: 8,
          color: textColor,
        } as TextStyle,

        // Blockquote
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: colors.secondary,
          paddingLeft: 12,
          marginVertical: 8,
          backgroundColor: colors.codeBackground,
          borderRadius: 4,
          opacity: 0.9,
        } as ViewStyle,

        // Lists
        bullet_list: {
          marginVertical: 4,
        } as ViewStyle,
        ordered_list: {
          marginVertical: 4,
        } as ViewStyle,
        list_item: {
          flexDirection: 'row',
          marginVertical: 2,
        } as ViewStyle,
        bullet_list_icon: {
          fontFamily,
          fontSize,
          lineHeight,
          marginRight: 8,
          color: textColor,
        } as TextStyle,
        bullet_list_content: {
          flex: 1,
        } as ViewStyle,
        ordered_list_icon: {
          fontFamily,
          fontSize,
          lineHeight,
          marginRight: 8,
          color: textColor,
        } as TextStyle,
        ordered_list_content: {
          flex: 1,
        } as ViewStyle,

        // Links
        link: {
          color: colors.green,
          textDecorationLine: 'underline',
        } as TextStyle,

        // Horizontal rule
        hr: {
          backgroundColor: colors.secondary,
          height: 1,
          marginVertical: 12,
        } as ViewStyle,

        // Paragraph
        paragraph: {
          marginVertical: 4,
        } as ViewStyle,

        // Tables
        table: {
          borderWidth: 1,
          borderColor: colors.secondary,
          borderRadius: 4,
          marginVertical: 8,
        } as ViewStyle,
        thead: {
          backgroundColor: colors.codeBackground,
        } as ViewStyle,
        th: {
          fontFamily: 'Cardo-Bold',
          padding: 8,
          borderBottomWidth: 1,
          borderColor: colors.secondary,
        } as TextStyle,
        tr: {
          borderBottomWidth: 1,
          borderColor: colors.secondary,
        } as ViewStyle,
        td: {
          fontFamily,
          padding: 8,
        } as TextStyle,

        // Images
        image: {
          marginVertical: 8,
          borderRadius: 4,
        } as ViewStyle,
      };
    }, [baseStyle, colors]);

    // Custom rules for code blocks with syntax highlighting
    const rules: RenderRules = useMemo(
      () => ({
        // Ensure text nodes inherit proper styling
        textgroup: (node, children) => children,

        // Fenced code blocks with syntax highlighting
        fence: (node) => {
          // Extract language from the info string (e.g., ```javascript)
          // sourceInfo exists at runtime but isn't in type definitions
          const language =
            (node as unknown as { sourceInfo?: string }).sourceInfo || 'text';
          const code = node.content || '';
          const lineCount = code.split('\n').length;
          // Calculate height: (lines * lineHeight) + topPadding + scrollbar clearance
          const estimatedHeight = lineCount * 20 + 12 + 16;

          return (
            <View
              key={node.key}
              style={[codeBlockStyles.container, { height: estimatedHeight }]}
            >
              <CodeHighlighter
                hljsStyle={codepenEmbed}
                language={language}
                scrollViewProps={{
                  style: codeBlockStyles.scrollView,
                  contentContainerStyle: codeBlockStyles.scrollContent,
                  nestedScrollEnabled: true,
                }}
                textStyle={codeBlockStyles.text}
              >
                {code.replace(/\n$/, '')}
              </CodeHighlighter>
            </View>
          );
        },

        // Indented code blocks (no language specified)
        code_block: (node) => {
          const code = node.content || '';
          const lineCount = code.split('\n').length;
          // Calculate height: (lines * lineHeight) + topPadding + scrollbar clearance
          const estimatedHeight = lineCount * 20 + 12 + 16;

          return (
            <View
              key={node.key}
              style={[codeBlockStyles.container, { height: estimatedHeight }]}
            >
              <CodeHighlighter
                hljsStyle={codepenEmbed}
                language="text"
                scrollViewProps={{
                  style: codeBlockStyles.scrollView,
                  contentContainerStyle: codeBlockStyles.scrollContent,
                  nestedScrollEnabled: true,
                }}
                textStyle={codeBlockStyles.text}
              >
                {code.replace(/\n$/, '')}
              </CodeHighlighter>
            </View>
          );
        },
      }),
      []
    );

    return (
      <Markdown style={styles} rules={rules} mergeStyle>
        {children}
      </Markdown>
    );
  }
);

const codeBlockStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
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
    paddingBottom: 16, // clearance for horizontal scrollbar
    paddingLeft: 12,
    paddingRight: 24, // extra padding so code doesn't touch edge when scrolled
  },
  text: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
