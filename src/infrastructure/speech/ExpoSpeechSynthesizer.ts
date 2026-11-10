import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type {
  ISpeechSynthesizer,
  SpeechEvents,
  SpeechUtterance,
  SystemVoice,
} from '@application/services/speech';
import { splitSpeechText } from './split-speech-text';

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
      this.speakPieces(utterance, events);
    });
  }

  /**
   * Android's engine rejects text over `maxSpeechInputLength`, so a long
   * reply is queued as several utterances that read as one: the first
   * piece's start, the last piece's finish, and the first stop or error
   * settle it.
   */
  private speakPieces(utterance: SpeechUtterance, events: SpeechEvents): void {
    const pieces = splitSpeechText(utterance.text, Speech.maxSpeechInputLength);
    let settled = false;
    const settle = (callback?: () => void) => {
      if (!settled) {
        settled = true;
        callback?.();
      }
    };
    const fail = (error: Error) => {
      if (!settled) {
        void Speech.stop();
      }
      settle(() => events.onError?.(error));
    };
    try {
      pieces.forEach((piece, index) => {
        Speech.speak(piece, {
          voice: utterance.voiceIdentifier,
          pitch: utterance.pitch,
          volume: 1.0,
          onStart: index === 0 ? events.onStart : undefined,
          onDone:
            index === pieces.length - 1
              ? () => settle(events.onDone)
              : undefined,
          onStopped: () => settle(events.onStopped),
          onError: fail,
        });
      });
    } catch (caught) {
      fail(caught instanceof Error ? caught : new Error(String(caught)));
    }
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
