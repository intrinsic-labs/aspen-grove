import * as Speech from 'expo-speech';
import type {
  ISpeechSynthesizer,
  SpeechEvents,
  SpeechUtterance,
  SystemVoice,
} from '@application/services/speech';

/**
 * `ISpeechSynthesizer` over expo-speech (AVSpeechSynthesizer on iOS,
 * TextToSpeech on Android), at the platform's default rate and full volume.
 *
 * iOS silent mode: expo-speech plays through the app's audio session and
 * never sets its category, so the default (`soloAmbient`) applies and the
 * ring/silent switch mutes speech on a device. Latent Spaces sets `.playback`;
 * doing that here needs an audio-session module (expo-audio's
 * `setAudioModeAsync({ playsInSilentMode: true })`), which the app does not
 * ship yet.
 */
export class ExpoSpeechSynthesizer implements ISpeechSynthesizer {
  speak(utterance: SpeechUtterance, events: SpeechEvents): void {
    Speech.speak(utterance.text, {
      voice: utterance.voiceIdentifier,
      pitch: utterance.pitch,
      volume: 1.0,
      onStart: events.onStart,
      onDone: events.onDone,
      onStopped: events.onStopped,
      onError: events.onError,
    });
  }

  stop(): Promise<void> {
    return Speech.stop();
  }

  async getAvailableVoices(): Promise<readonly SystemVoice[]> {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.map((voice) => ({
      identifier: voice.identifier,
      name: voice.name,
      language: voice.language,
    }));
  }
}
