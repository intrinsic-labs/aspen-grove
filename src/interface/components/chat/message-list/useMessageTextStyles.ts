import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import type { ChatDisplayPreferences } from '../types';
import { toMessageTextStyle } from './message-text-style';

/**
 * The list's message text style, from the reader's display preferences, and
 * the dimmer one a reply uses while it streams. Both stay stable until a
 * preference changes, so memoized rows don't re-render.
 */
export const useMessageTextStyles = ({
  messageFontFamily,
  messageFontSize,
  messageLineHeight,
}: ChatDisplayPreferences) => {
  const messageTextStyle = useMemo<TextStyle>(
    () =>
      toMessageTextStyle({
        messageFontFamily,
        messageFontSize,
        messageLineHeight,
      }),
    [messageFontFamily, messageFontSize, messageLineHeight]
  );
  const streamingTextStyle = useMemo<TextStyle>(
    () => ({
      ...messageTextStyle,
      opacity: loomUiTokens.messageList.messageTextOpacity,
    }),
    [messageTextStyle]
  );
  return { messageTextStyle, streamingTextStyle };
};
