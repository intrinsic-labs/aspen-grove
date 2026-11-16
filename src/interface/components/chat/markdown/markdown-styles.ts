import type { TextStyle } from 'react-native';
import { markdownBlockStyles } from './markdown-block-styles';
import { markdownHeadingStyles } from './markdown-heading-styles';
import { markdownInlineStyles } from './markdown-inline-styles';
import {
  type MarkdownColors,
  toMarkdownTypography,
} from './markdown-typography';

/**
 * react-native-markdown-display's style sheet for one message, styled to
 * Aspen Grove's typography and theme and scaled from the message's base
 * style.
 */
export const createMarkdownStyles = (
  baseStyle: TextStyle | undefined,
  colors: MarkdownColors
) => {
  const typography = toMarkdownTypography(baseStyle, colors);
  return {
    ...markdownInlineStyles(typography, colors),
    ...markdownHeadingStyles(typography),
    ...markdownBlockStyles(typography, colors),
  };
};
