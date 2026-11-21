import type { TextStyle, ViewStyle } from 'react-native';
import type { MarkdownColors, MarkdownTypography } from './markdown-typography';

/** Body text, paragraphs, emphasis, inline code and links. */
export const markdownInlineStyles = (
  { fontFamily, fontSize, lineHeight, textColor }: MarkdownTypography,
  colors: MarkdownColors
) => ({
  // The space between blocks is the body rule's (`blockSpacing`).
  body: {
    fontFamily,
    fontSize,
    lineHeight,
    color: textColor,
  } as TextStyle,
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  } as ViewStyle,

  // Emphasis. The face is already bold or italic: the library's default
  // fontWeight 'bold' / fontStyle 'italic' (merged in) would make Android
  // look for a bold "Cardo-Bold" and fall back to the system sans.
  strong: {
    fontFamily: 'Cardo-Bold',
    fontWeight: 'normal',
  } as TextStyle,
  em: {
    fontFamily: 'Cardo-Italic',
    fontStyle: 'normal',
  } as TextStyle,
  s: {
    textDecorationLine: 'line-through',
  } as TextStyle,

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

  link: {
    color: colors.green,
    textDecorationLine: 'underline',
  } as TextStyle,
});
