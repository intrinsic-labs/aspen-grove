/**
 * LoomVoice value object: a named character voice that reads nodes aloud.
 *
 * Ported from Latent Spaces (`Loom/data/LoomVoice.swift`). Each persona
 * prefers one iOS system voice (`synthesizerIdentifier`); `systemVoiceName`
 * and `language` let the app find the nearest installed voice when that exact
 * identifier is missing (see `resolveSystemVoice`). Colors and icons are
 * presentation and live in the interface layer.
 */
export type LoomVoiceName = 'Lily' | 'Jefferson' | 'Eve';

export interface LoomVoice {
  readonly name: LoomVoiceName;
  /** Pitch multiplier; 1.0 is the voice's normal pitch. */
  readonly pitch: number;
  /** The preferred iOS `AVSpeechSynthesisVoice` identifier. */
  readonly synthesizerIdentifier: string;
  /** The system voice's display name, for the same-name fallback. */
  readonly systemVoiceName: string;
  /** BCP 47 language of the preferred voice, for the language fallbacks. */
  readonly language: string;
  readonly description: string;
  /** What the voice says when demoed in the chooser. */
  readonly sampleSpeech: string;
}

export const JEFFERSON_VOICE: LoomVoice = {
  name: 'Jefferson',
  pitch: 1.0,
  synthesizerIdentifier: 'com.apple.ttsbundle.Daniel-compact',
  systemVoiceName: 'Daniel',
  language: 'en-GB',
  description: 'Musing male voice from across the pond.',
  sampleSpeech:
    "Greetings. I'm Jefferson. Perhaps you'd care for a spot of humor? Why don't scientists trust atoms? Because they make up everything. Ha ha ha.",
};

export const LILY_VOICE: LoomVoice = {
  name: 'Lily',
  pitch: 1.075,
  synthesizerIdentifier: 'com.apple.ttsbundle.Karen-compact',
  systemVoiceName: 'Karen',
  language: 'en-AU',
  description: 'A contemplative female voice with an Australian accent.',
  sampleSpeech:
    "I'm Lily. I enjoy long walks in the evening, when the sun is low and the air is sweet, and the grass rolls in the breeze like a golden ocean.",
};

export const EVE_VOICE: LoomVoice = {
  name: 'Eve',
  pitch: 1.0,
  synthesizerIdentifier: 'com.apple.ttsbundle.Moira-compact',
  systemVoiceName: 'Moira',
  language: 'en-IE',
  description: 'Warm female voice with an Irish accent.',
  sampleSpeech:
    "Hello there! I'm Eve, and I'm delighted to meet you. I belive Semisonic had it right - every new beginning comes from some other beginning's end.",
};

/** Chooser order, as in Latent Spaces. */
export const LOOM_VOICES: readonly LoomVoice[] = [
  LILY_VOICE,
  JEFFERSON_VOICE,
  EVE_VOICE,
];

export const DEFAULT_LOOM_VOICE: LoomVoice = JEFFERSON_VOICE;

/** The persona with this name, or the default (Jefferson) for anything else. */
export const findLoomVoice = (name: string | null | undefined): LoomVoice =>
  LOOM_VOICES.find((voice) => voice.name === name) ?? DEFAULT_LOOM_VOICE;
