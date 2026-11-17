import type { LoomVoice } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';

/** "Daniel" matches "Daniel" and "Daniel (Enhanced)", not "Danielle". */
export const hasVoiceName = (voice: SystemVoice, name: string): boolean => {
  const voiceName = voice.name.trim().toLowerCase();
  const wanted = name.toLowerCase();
  return voiceName === wanted || voiceName.startsWith(`${wanted} (`);
};

/** Index in the persona's Android list, or its length when not listed. */
export const androidPreference = (
  persona: LoomVoice,
  voice: SystemVoice
): number => {
  const identifier = voice.identifier.toLowerCase();
  const index = persona.androidVoices.findIndex(
    (prefix) => identifier === prefix || identifier.startsWith(`${prefix}-`)
  );
  return index === -1 ? persona.androidVoices.length : index;
};

/**
 * Orders candidates by how well they keep the persona's feel: the iOS voice's
 * name (Daniel, Karen, Moira), then the persona's Android voices in order,
 * then higher quality. Ties keep the platform's order.
 */
export const rankPersonaVoices = (
  persona: LoomVoice,
  candidates: readonly SystemVoice[]
): readonly SystemVoice[] => {
  const keyed = candidates.map((voice, order) => ({
    voice,
    order,
    named: hasVoiceName(voice, persona.systemVoiceName) ? 0 : 1,
    preference: androidPreference(persona, voice),
    quality: voice.quality ?? 0,
  }));
  keyed.sort(
    (a, b) =>
      a.named - b.named ||
      a.preference - b.preference ||
      b.quality - a.quality ||
      a.order - b.order
  );
  return keyed.map(({ voice }) => voice);
};
