import { useCallback } from 'react';
import type { VoicePreferences } from '@domain/entities';

type UseVoiceModeToggleInput = {
  readonly update: (changes: Partial<VoicePreferences>) => Promise<void>;
  readonly stopSpeaking: () => void;
};

/**
 * Turns Voice Mode on or off. Turning it off also silences the utterance
 * playing now: off means quiet at once, not after the current reply.
 */
export const useVoiceModeToggle = ({
  update,
  stopSpeaking,
}: UseVoiceModeToggleInput) =>
  useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        stopSpeaking();
      }
      void update({ voiceModeEnabled: enabled });
    },
    [stopSpeaking, update]
  );
