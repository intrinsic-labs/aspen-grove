/**
 * Port for on-device text-to-speech. Infrastructure implements it (expo-speech
 * today); the app never talks to the platform synthesizer directly.
 */

/** A voice installed on this device, as the platform reports it. */
export interface SystemVoice {
  /** The value the synthesizer accepts to select this voice. */
  readonly identifier: string;
  readonly name: string;
  /** BCP 47 language, e.g. `en-GB`. */
  readonly language: string;
}

export interface SpeechUtterance {
  readonly text: string;
  /** A `SystemVoice.identifier`; omit for the system default voice. */
  readonly voiceIdentifier?: string;
  /** 1.0 is normal pitch. */
  readonly pitch: number;
}

/** Lifecycle callbacks for one utterance. */
export interface SpeechEvents {
  readonly onStart?: () => void;
  readonly onDone?: () => void;
  /** The utterance was interrupted by `stop()`. */
  readonly onStopped?: () => void;
  readonly onError?: (error: Error) => void;
}

export interface ISpeechSynthesizer {
  /** Speaks one utterance at the default rate and full volume. */
  speak(utterance: SpeechUtterance, events: SpeechEvents): void;
  /** Stops speaking immediately and clears anything queued. */
  stop(): Promise<void>;
  getAvailableVoices(): Promise<readonly SystemVoice[]>;
}
