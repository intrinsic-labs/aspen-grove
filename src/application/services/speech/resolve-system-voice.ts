import type { LoomVoice } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';

export type SystemVoiceMatch =
  | 'exact'
  | 'same-name'
  | 'same-language'
  | 'system-default';

export interface ResolvedSystemVoice {
  readonly match: SystemVoiceMatch;
  /** Undefined for `system-default`: let the platform pick. */
  readonly voiceIdentifier?: string;
}

const normalizeLanguage = (language: string): string =>
  language.trim().replace(/_/g, '-').toLowerCase();

/** "Daniel" matches "Daniel" and "Daniel (Enhanced)", not "Danielle". */
const hasVoiceName = (voice: SystemVoice, name: string): boolean => {
  const voiceName = voice.name.trim().toLowerCase();
  const wanted = name.toLowerCase();
  return voiceName === wanted || voiceName.startsWith(`${wanted} (`);
};

/**
 * Picks the installed voice closest to a persona's preferred one, because the
 * Latent Spaces identifiers (`com.apple.ttsbundle.*-compact`) are not on every
 * device or simulator, and never on Android:
 *
 * 1. the exact identifier;
 * 2. a voice with the same name (Daniel, Karen, Moira) in the same language;
 * 3. any voice in the same language (en-GB, en-AU, en-IE);
 * 4. the system default.
 */
export const resolveSystemVoice = (
  persona: LoomVoice,
  available: readonly SystemVoice[]
): ResolvedSystemVoice => {
  const exact = available.find(
    (voice) => voice.identifier === persona.synthesizerIdentifier
  );
  if (exact) {
    return { match: 'exact', voiceIdentifier: exact.identifier };
  }

  const language = normalizeLanguage(persona.language);
  const sameLanguage = available.filter(
    (voice) => normalizeLanguage(voice.language) === language
  );

  const sameName = sameLanguage.find((voice) =>
    hasVoiceName(voice, persona.systemVoiceName)
  );
  if (sameName) {
    return { match: 'same-name', voiceIdentifier: sameName.identifier };
  }

  const first = sameLanguage[0];
  if (first) {
    return { match: 'same-language', voiceIdentifier: first.identifier };
  }

  return { match: 'system-default' };
};
