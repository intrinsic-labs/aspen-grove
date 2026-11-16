import type { TextStyle, ViewStyle } from 'react-native';
import type { MarkdownColors, MarkdownTypography } from './markdown-typography';

/** Body text, paragraphs, emphasis, inline code and links. */
export const markdownInlineStyles = (
  { fontFamily, fontSize, lineHeight, textColor }: MarkdownTypography,
  colors: MarkdownColors
) => ({
  // Blocks sit one empty line apart, as plain text with a blank line
  // between paragraphs reads in Latent Spaces.
  body: {
    fontFamily,
    fontSize,
    lineHeight,
    color: textColor,
    gap: lineHeight,
  } as TextStyle,
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  } as ViewStyle,

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
