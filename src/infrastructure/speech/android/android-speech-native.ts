import { requireOptionalNativeModule } from 'expo';

/** One voice of the default Android TTS engine, as `modules/android-speech` reads it. */
export interface AndroidVoiceDetail {
  /** The voice name, which is also expo-speech's identifier for it. */
  readonly name: string;
  /** 100 (very low) to 500 (very high). */
  readonly quality: number;
  readonly requiresNetwork: boolean;
  /** False when the voice's data has not been downloaded. */
  readonly installed: boolean;
}

/** Sent when another app takes audio focus for good while speech holds it. */
export const AUDIO_FOCUS_LOST_EVENT = 'onAudioFocusLost';

/** The local module in `modules/android-speech` (Android only). */
export interface AndroidSpeechNative {
  addListener(
    event: typeof AUDIO_FOCUS_LOST_EVENT,
    listener: () => void
  ): { remove(): void };
  /** Transient may-duck focus; resolves whether it was granted. */
  requestDuckingFocus(): Promise<boolean>;
  abandonFocus(): Promise<void>;
  getVoiceDetails(): Promise<AndroidVoiceDetail[]>;
}

/** Null on iOS, in Jest and in a build without the module. */
export const androidSpeechNative =
  requireOptionalNativeModule<AndroidSpeechNative>('AndroidSpeech');
