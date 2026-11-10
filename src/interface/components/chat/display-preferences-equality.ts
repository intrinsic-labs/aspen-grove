import type { ChatDisplayPreferences } from './types';

/** True when two display preferences would draw the messages the same. */
export const sameDisplayPreferences = (
  left: ChatDisplayPreferences,
  right: ChatDisplayPreferences
): boolean =>
  left.userNodeViewStyle === right.userNodeViewStyle &&
  left.userNodeCornerRadius === right.userNodeCornerRadius &&
  left.messageFontSize === right.messageFontSize &&
  left.messageLineHeight === right.messageLineHeight &&
  left.messageFontFamily === right.messageFontFamily;
