import { fonts } from '@interface/ui/value-objects/fonts';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { MarkdownColors, MarkdownTypography } from './markdown-typography';

/** The fontStyle that keeps an italic face italic on each platform. */
export const emphasisSlant = (
  os: string,
  faces: {
    readonly regular: string | undefined;
    readonly italic: string | undefined;
  }
): 'italic' | 'normal' =>
  faces.regular === undefined ||
  (os === 'ios' && faces.italic !== faces.regular)
    ? 'italic'
    : 'normal';

/** Body text, paragraphs, emphasis, inline code and links. */
export const markdownInlineStyles = (
  {
    fontFamily,
    faces,
    code,
    fontSize,
    lineHeight,
    textColor,
  }: MarkdownTypography,
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

  // Bundled emphasis faces are already bold or italic: the library's default
  // fontWeight 'bold' / fontStyle 'italic' (merged in) would make Android
  // look for a bold variant of an already-bold face and fall back to the system sans.
  strong: {
    fontFamily: faces.bold,
    fontWeight: faces.bold === undefined ? 'bold' : 'normal',
  } as TextStyle,
  // iOS is the other way round: an explicit fontStyle 'normal' makes RCTFont
  // pick the family's upright face (RCTFont.mm, `isItalic = style ? ...`),
  // so a real italic face is asked for as italic there. VT220 has none.
  // System has no bundled faces; native weight and slant synthesize both.
  em: {
    fontFamily: faces.italic,
    fontStyle: emphasisSlant(Platform.OS, faces),
  } as TextStyle,
  s: {
    textDecorationLine: 'line-through',
  } as TextStyle,

  code_inline: {
    fontFamily: code.family,
    fontSize: fontSize * code.scale,
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
