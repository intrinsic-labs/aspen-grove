import { EVE_VOICE, JEFFERSON_VOICE, LILY_VOICE } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';
import { resolveSystemVoice } from './resolve-system-voice';

const voice = (
  identifier: string,
  name: string,
  language: string
): SystemVoice => ({ identifier, name, language });

/** An Android (Google TTS) voice: its name is its identifier. */
const android = (
  name: string,
  language: string,
  details: Partial<SystemVoice> = {}
): SystemVoice => ({
  identifier: name,
  name,
  language,
  installed: true,
  requiresNetwork: name.endsWith('-network'),
  quality: 400,
  ...details,
});

describe('resolveSystemVoice', () => {
  it('prefers the exact Latent Spaces identifier', () => {
    const available = [
      voice('com.apple.voice.compact.en-GB.Daniel', 'Daniel', 'en-GB'),
      voice('com.apple.ttsbundle.Daniel-compact', 'Daniel', 'en-GB'),
    ];

    expect(resolveSystemVoice(JEFFERSON_VOICE, available)).toEqual({
      match: 'exact',
      voiceIdentifier: 'com.apple.ttsbundle.Daniel-compact',
    });
  });

  it('falls back to the same name in the same language', () => {
    const available = [
      voice('com.apple.voice.compact.en-AU.Lee', 'Lee', 'en-AU'),
      voice('com.apple.voice.compact.en-US.Karen', 'Karen', 'en-US'),
      voice(
        'com.apple.voice.enhanced.en-AU.Karen',
        'Karen (Enhanced)',
        'en-AU'
      ),
    ];

    expect(resolveSystemVoice(LILY_VOICE, available)).toEqual({
      match: 'same-name',
      voiceIdentifier: 'com.apple.voice.enhanced.en-AU.Karen',
    });
  });

  it('does not treat a longer name as the same voice', () => {
    const available = [
      voice('x.Moiraine', 'Moiraine', 'en-IE'),
      voice('x.Other', 'Other', 'en-IE'),
    ];

    expect(resolveSystemVoice(EVE_VOICE, available)).toEqual({
      match: 'same-language',
      voiceIdentifier: 'x.Moiraine',
    });
  });

  it('falls back to any voice of the language, matching Android ids and underscores', () => {
    const available = [
      voice('en-us-x-sfg-local', 'en-us-x-sfg-local', 'en-US'),
      voice('en-gb-x-gba-local', 'en-gb-x-gba-local', 'en_GB'),
    ];

    expect(resolveSystemVoice(JEFFERSON_VOICE, available)).toEqual({
      match: 'same-language',
      voiceIdentifier: 'en-gb-x-gba-local',
    });
  });

  it('uses the system default when nothing matches the language', () => {
    const available = [voice('x.Samantha', 'Samantha', 'en-US')];

    expect(resolveSystemVoice(EVE_VOICE, available)).toEqual({
      match: 'system-default',
    });
    expect(resolveSystemVoice(EVE_VOICE, [])).toEqual({
      match: 'system-default',
    });
  });
});

describe('resolveSystemVoice on Android', () => {
  it("skips a network voice for the persona's installed local one", () => {
    // The emulator listed aub's network voice first, and gave it to Lily.
    const available = [
      android('en-au-x-aub-network', 'en-AU'),
      android('en-au-x-aub-local', 'en-AU'),
      android('en-au-x-aua-network', 'en-AU'),
      android('en-au-x-aua-local', 'en-AU'),
    ];

    expect(resolveSystemVoice(LILY_VOICE, available)).toEqual({
      match: 'same-language',
      voiceIdentifier: 'en-au-x-aua-local',
    });
  });

  it('keeps the accent over the preferred gender when that is all there is', () => {
    const available = [
      android('en-us-x-iom-local', 'en-US'),
      android('en-gb-x-gba-local', 'en-GB'),
    ];

    expect(resolveSystemVoice(JEFFERSON_VOICE, available)).toEqual({
      match: 'same-language',
      voiceIdentifier: 'en-gb-x-gba-local',
    });
  });

  it('prefers higher quality among voices the persona does not list', () => {
    const available = [
      android('en-gb-x-aaa-local', 'en-GB', { quality: 300 }),
      android('en-GB-language', 'en-GB', { quality: 400 }),
    ];

    expect(resolveSystemVoice(JEFFERSON_VOICE, available).voiceIdentifier).toBe(
      'en-GB-language'
    );
  });

  it('moves to a nearby accent when the language pack is not downloaded', () => {
    // Jefferson's en-GB voices are listed but not installed.
    const available = [
      android('en-gb-x-gbd-local', 'en-GB', { installed: false }),
      android('en-gb-x-gbb-local', 'en-GB', { installed: false }),
      android('en-us-x-sfg-local', 'en-US'),
      android('en-us-x-tpd-local', 'en-US'),
      android('en-us-x-iom-network', 'en-US'),
    ];

    expect(resolveSystemVoice(JEFFERSON_VOICE, available)).toEqual({
      match: 'nearby-accent',
      voiceIdentifier: 'en-us-x-tpd-local',
    });
  });

  it("gives Eve, who has no Irish voice, a UK voice distinct from Jefferson's", () => {
    const available = [
      android('en-gb-x-gba-local', 'en-GB'),
      android('en-gb-x-gbd-local', 'en-GB'),
      android('en-gb-x-gbc-local', 'en-GB'),
    ];

    expect(resolveSystemVoice(EVE_VOICE, available)).toEqual({
      match: 'nearby-accent',
      voiceIdentifier: 'en-gb-x-gbc-local',
    });
    expect(resolveSystemVoice(JEFFERSON_VOICE, available).voiceIdentifier).toBe(
      'en-gb-x-gbd-local'
    );
  });

  it('uses the system default rather than a voice that needs the network', () => {
    const available = [
      android('en-au-x-aua-network', 'en-AU'),
      android('en-us-x-tpf-local', 'en-US', { installed: false }),
    ];

    expect(resolveSystemVoice(LILY_VOICE, available)).toEqual({
      match: 'system-default',
    });
  });
});
