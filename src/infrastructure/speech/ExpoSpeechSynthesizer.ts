import { setAudioModeAsync } from 'expo-audio';
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
 * iOS silent mode: expo-speech never sets the audio session category, so by
 * default the ring/silent switch mutes it. Like Latent Spaces (`.playback`
 * with duck-others), the first utterance first sets the shared session to
 * playback through expo-audio, so speech plays with the switch on and other
 * apps' audio ducks under it. A failure there only costs silent-mode playback.
 */
export class ExpoSpeechSynthesizer implements ISpeechSynthesizer {
  private audioSession: Promise<void> | null = null;
  /** Bumped by stop(), so an utterance still waiting on the session never starts. */
  private generation = 0;

  speak(utterance: SpeechUtterance, events: SpeechEvents): void {
    const generation = this.generation;
    void this.ensurePlaybackSession().then(() => {
      if (generation !== this.generation) {
        events.onStopped?.();
        return;
      }
      Speech.speak(utterance.text, {
        voice: utterance.voiceIdentifier,
        pitch: utterance.pitch,
        volume: 1.0,
        onStart: events.onStart,
        onDone: events.onDone,
        onStopped: events.onStopped,
        onError: events.onError,
      });
    });
  }

  private ensurePlaybackSession(): Promise<void> {
    this.audioSession ??= setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {
      this.audioSession = null;
    });
    return this.audioSession;
  }

  stop(): Promise<void> {
    this.generation += 1;
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
