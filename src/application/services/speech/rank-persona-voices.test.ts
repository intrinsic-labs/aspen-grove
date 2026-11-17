import { JEFFERSON_VOICE, LILY_VOICE } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';
import { androidPreference, rankPersonaVoices } from './rank-persona-voices';

const voice = (identifier: string, quality?: number): SystemVoice => ({
  identifier,
  name: identifier,
  language: 'en-GB',
  quality,
});

describe('androidPreference', () => {
  it('matches a listed prefix on its local and network variants only', () => {
    expect(androidPreference(JEFFERSON_VOICE, voice('en-gb-x-gbd-local'))).toBe(
      0
    );
    expect(
      androidPreference(JEFFERSON_VOICE, voice('en-gb-x-gbb-network'))
    ).toBe(1);
    expect(
      androidPreference(JEFFERSON_VOICE, voice('en-gb-x-gbdx-local'))
    ).toBe(JEFFERSON_VOICE.androidVoices.length);
  });
});

describe('rankPersonaVoices', () => {
  it('ranks the system name first, then the Android list, then quality', () => {
    const ranked = rankPersonaVoices(JEFFERSON_VOICE, [
      voice('en-gb-x-zzz-local', 500),
      voice('en-gb-x-gbb-local', 300),
      { ...voice('daniel'), name: 'Daniel (Enhanced)' },
      voice('en-gb-x-yyy-local', 400),
      voice('en-gb-x-gbd-local', 200),
    ]);

    expect(ranked.map((v) => v.identifier)).toEqual([
      'daniel',
      'en-gb-x-gbd-local',
      'en-gb-x-gbb-local',
      'en-gb-x-zzz-local',
      'en-gb-x-yyy-local',
    ]);
  });

  it("keeps the platform's order on a tie", () => {
    const ranked = rankPersonaVoices(LILY_VOICE, [voice('b'), voice('a')]);
    expect(ranked.map((v) => v.identifier)).toEqual(['b', 'a']);
  });
});
