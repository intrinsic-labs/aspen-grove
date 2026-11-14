import type { TextStyle } from 'react-native';
import type { ChatDisplayPreferences } from '../types';

/**
 * Message text in the reader's chosen face and size (Latent Spaces' loom
 * font), shared by rows, continuation cards and node sheets.
 */
export const toMessageTextStyle = (
  preferences: Pick<
    ChatDisplayPreferences,
    'messageFontSize' | 'messageLineHeight' | 'messageFontFamily'
  >
): TextStyle => ({
  fontSize: preferences.messageFontSize,
  lineHeight: preferences.messageLineHeight,
  ...(preferences.messageFontFamily
    ? { fontFamily: preferences.messageFontFamily }
    : {}),
});
