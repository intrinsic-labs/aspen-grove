import type { SystemVoice } from '@application/services/speech';
import type { AndroidVoiceDetail } from './android-speech-native';

/**
 * Adds what expo-speech leaves out of each Android voice (installed, needs
 * the network, raw quality), matched by name. A voice with no detail is left
 * as it was.
 */
export const withVoiceDetails = (
  voices: readonly SystemVoice[],
  details: readonly AndroidVoiceDetail[]
): readonly SystemVoice[] => {
  const byName = new Map(details.map((detail) => [detail.name, detail]));
  return voices.map((voice) => {
    const detail = byName.get(voice.identifier);
    if (!detail) {
      return voice;
    }
    return {
      ...voice,
      installed: detail.installed,
      requiresNetwork: detail.requiresNetwork,
      quality: detail.quality,
    };
  });
};
