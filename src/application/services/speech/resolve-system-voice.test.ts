import { EVE_VOICE, JEFFERSON_VOICE, LILY_VOICE } from '@domain/value-objects';
import type { SystemVoice } from './ISpeechSynthesizer';
import { resolveSystemVoice } from './resolve-system-voice';

const voice = (
  identifier: string,
  name: string,
  language: string
): SystemVoice => ({ identifier, name, language });

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
