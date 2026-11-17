import type { LoomVoice } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';
import {
  androidPreference,
  hasVoiceName,
  rankPersonaVoices,
} from './rank-persona-voices';

export type SystemVoiceMatch =
  'exact' | 'same-name' | 'same-language' | 'nearby-accent' | 'system-default';

export interface ResolvedSystemVoice {
  readonly match: SystemVoiceMatch;
  /** Undefined for `system-default`: let the platform pick. */
  readonly voiceIdentifier?: string;
}

const normalizeLanguage = (language: string): string =>
  language.trim().replace(/_/g, '-').toLowerCase();

/**
 * Speaks now, offline: its data is on the device and it needs no network.
 * A voice that isn't (Android) either starts a download and reads in another
 * voice meanwhile, or falls back to another voice when offline.
 */
const isUsableOffline = (voice: SystemVoice): boolean =>
  voice.installed !== false && voice.requiresNetwork !== true;

/**
 * Picks the installed voice closest to a persona's preferred one, because the
 * Latent Spaces identifiers (`com.apple.ttsbundle.*-compact`) are not on every
 * device or simulator, and never on Android:
 *
 * 1. the exact identifier;
 * 2. a voice in the persona's language (en-GB, en-AU, en-IE), ranked by
 *    `rankPersonaVoices`: same name (Daniel, Karen, Moira), the persona's
 *    Android voices, quality;
 * 3. one of the persona's Android voices in a nearby accent, in its order;
 * 4. the system default.
 *
 * Steps 2 and 3 consider only voices that are installed and work offline.
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

  const usable = available.filter(isUsableOffline);
  const language = normalizeLanguage(persona.language);
  const sameLanguage = usable.filter(
    (voice) => normalizeLanguage(voice.language) === language
  );

  const best = rankPersonaVoices(persona, sameLanguage)[0];
  if (best) {
    const match = hasVoiceName(best, persona.systemVoiceName)
      ? 'same-name'
      : 'same-language';
    return { match, voiceIdentifier: best.identifier };
  }

  const nearby = usable.filter(
    (voice) => androidPreference(persona, voice) < persona.androidVoices.length
  );
  const nearest = rankPersonaVoices(persona, nearby)[0];
  if (nearest) {
    return { match: 'nearby-accent', voiceIdentifier: nearest.identifier };
  }

  return { match: 'system-default' };
};
