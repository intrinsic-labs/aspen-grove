import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type {
  ISpeechSynthesizer,
  SpeechEvents,
  SpeechUtterance,
  SystemVoice,
} from '@application/services/speech';
import {
  androidSpeechNative,
  type AndroidSpeechNative,
} from './android/android-speech-native';
import { SpeechAudioFocus } from './android/SpeechAudioFocus';
import { withVoiceDetails } from './android/with-voice-details';
import { devLog } from '@infrastructure/logging/dev-log';
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
 *
 * Android: expo-speech takes no audio focus and says nothing of which voices
 * are installed or offline. The local `android-speech` module adds both: each
 * utterance holds transient may-duck focus until it ends (and is stopped if
 * another app takes the focus for good), and the voices carry those details
 * for `resolveSystemVoice`.
 */
export class ExpoSpeechSynthesizer implements ISpeechSynthesizer {
  private readonly android: AndroidSpeechNative | null;
  private readonly focus: SpeechAudioFocus;
  private audioSession: Promise<void> | null = null;
  /** Bumped by stop(), so an utterance still waiting on the session never starts. */
  private generation = 0;

  constructor(android: AndroidSpeechNative | null = androidSpeechNative) {
    this.android = android;
    this.focus = new SpeechAudioFocus(android);
  }

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
    devLog('Speaking', {
      voice: utterance.voiceIdentifier ?? 'system default',
      pitch: utterance.pitch,
    });
    // Another app took the audio focus for good: end the reading as a stop.
    const releaseFocus = this.focus.acquire(() => {
      settle(events.onStopped);
      void this.stop();
    });
    let settled = false;
    const settle = (callback?: () => void) => {
      if (!settled) {
        settled = true;
        releaseFocus();
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
    this.focus.release();
    return Speech.stop();
  }

  async getAvailableVoices(): Promise<readonly SystemVoice[]> {
    const [voices, details] = await Promise.all([
      Speech.getAvailableVoicesAsync(),
      this.android?.getVoiceDetails().catch(() => []) ?? [],
    ]);
    return withVoiceDetails(
      voices.map((voice) => ({
        identifier: voice.identifier,
        name: voice.name,
        language: voice.language,
      })),
      details
    );
  }
}
