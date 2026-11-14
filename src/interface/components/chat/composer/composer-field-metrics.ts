import type { TextStyle } from 'react-native';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import type { ChatDisplayPreferences } from '../types';

export type ComposerFieldMetrics = {
  readonly textStyle: TextStyle;
  /** One line plus the field's padding: 48 pt at the default size. */
  readonly minHeight: number;
  /** The collapsed field's cap; past it the input scrolls. */
  readonly maxHeight: number;
  readonly lineHeight: number;
};

/**
 * The composer field's type and height, in the reader's message font
 * (`loadLoomFont()`, MessageField.swift:41).
 */
export const composerFieldMetrics = (
  preferences: ChatDisplayPreferences
): ComposerFieldMetrics => {
  const verticalPadding = loomUiTokens.composer.textPaddingVertical * 2;
  const lineHeight = preferences.messageLineHeight;
  return {
    textStyle: {
      fontSize: preferences.messageFontSize,
      lineHeight,
      ...(preferences.messageFontFamily
        ? { fontFamily: preferences.messageFontFamily }
        : {}),
    },
    minHeight: lineHeight + verticalPadding,
    maxHeight:
      lineHeight * loomUiTokens.composer.inputCollapsedMaxLines +
      verticalPadding,
    lineHeight,
  };
};
