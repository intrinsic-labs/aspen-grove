import type { ColorValue, TextStyle } from 'react-native';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { toMessageType } from '../message-type';

const DEFAULT_TYPE = toMessageType(
  loomUiTokens.typography.defaultMessageFontSize,
  undefined
);

/** The palette entries markdown is drawn with. */
export type MarkdownColors = {
  readonly textColor: string;
  readonly secondary: string;
  readonly codeBackground: string;
  readonly green: string;
};

/** The message's face, size, line height and color every block scales from. */
export type MarkdownTypography = {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly textColor: ColorValue;
};

/** The message's base style, falling back to Latent Spaces' default type. */
export const toMarkdownTypography = (
  baseStyle: TextStyle | undefined,
  colors: MarkdownColors
): MarkdownTypography => ({
  fontFamily: baseStyle?.fontFamily ?? 'Cardo-Regular',
  fontSize: baseStyle?.fontSize ?? DEFAULT_TYPE.fontSize,
  lineHeight: baseStyle?.lineHeight ?? DEFAULT_TYPE.lineHeight,
  textColor: baseStyle?.color ?? colors.textColor,
});
