import type { TextStyle, ViewStyle } from 'react-native';
import type { MarkdownColors, MarkdownTypography } from './markdown-typography';

/**
 * Code blocks' text style. The custom rules (`markdown-rules`) draw both kinds
 * with `CodeBlock`, so these only reach the library's own fallbacks.
 */
const codeBlockStyle = ({
  fontSize,
  lineHeight,
  textColor,
}: MarkdownTypography): TextStyle => ({
  fontFamily: 'IBMPlexMono-Regular',
  fontSize: fontSize * 0.85,
  lineHeight: lineHeight * 0.9,
  backgroundColor: 'transparent',
  padding: 0,
  borderRadius: 0,
  borderWidth: 0,
  marginVertical: 8,
  color: textColor,
});

/** Code blocks, blockquotes, lists, rules, tables and images. */
export const markdownBlockStyles = (
  typography: MarkdownTypography,
  colors: MarkdownColors
) => {
  const { fontFamily, fontSize, lineHeight, textColor } = typography;
  const listIcon: TextStyle = {
    fontFamily,
    fontSize,
    lineHeight,
    marginRight: 8,
    color: textColor,
  };
  return {
    code_block: codeBlockStyle(typography),
    fence: codeBlockStyle(typography),

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
    bullet_list: { marginVertical: 4 } as ViewStyle,
    ordered_list: { marginVertical: 4 } as ViewStyle,
    list_item: { flexDirection: 'row', marginVertical: 2 } as ViewStyle,
    bullet_list_icon: { ...listIcon },
    bullet_list_content: { flex: 1 } as ViewStyle,
    ordered_list_icon: { ...listIcon },
    ordered_list_content: { flex: 1 } as ViewStyle,

    hr: {
      backgroundColor: colors.secondary,
      height: 1,
      marginVertical: 12,
    } as ViewStyle,

    // Tables
    table: {
      borderWidth: 1,
      borderColor: colors.secondary,
      borderRadius: 4,
      marginVertical: 8,
    } as ViewStyle,
    thead: { backgroundColor: colors.codeBackground } as ViewStyle,
    th: {
      fontFamily: 'Cardo-Bold',
      padding: 8,
      borderBottomWidth: 1,
      borderColor: colors.secondary,
    } as TextStyle,
    tr: { borderBottomWidth: 1, borderColor: colors.secondary } as ViewStyle,
    td: { fontFamily, padding: 8 } as TextStyle,

    image: { marginVertical: 8, borderRadius: 4 } as ViewStyle,
  };
};
