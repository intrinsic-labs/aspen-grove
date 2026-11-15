import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type {
  PendingTextPrompt,
  TextPromptRequest,
  TextPromptResult,
} from './text-prompt';

/**
 * Asks for a line of text. iOS shows the system alert with a text field
 * (`Alert.prompt`), Cancel then Save, as Latent Spaces' alerts do. Android
 * has no such alert, so `pending` drives `TextPromptDialog` instead.
 */
export const useTextPrompt = () => {
  const [pending, setPending] = useState<PendingTextPrompt | null>(null);

  const prompt = useCallback(
    (request: TextPromptRequest) =>
      new Promise<TextPromptResult>((resolve) => {
        if (Platform.OS !== 'ios') {
          setPending({
            request,
            resolve: (result) => {
              setPending(null);
              resolve(result);
            },
          });
          return;
        }
        Alert.prompt(
          request.title,
          request.message,
          [
            { text: 'Save', onPress: (text?: string) => resolve(text ?? '') },
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          ],
          'plain-text',
          request.initialValue
        );
      }),
    []
  );

  return { prompt, pending };
};
