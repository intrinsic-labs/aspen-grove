import { withVoiceDetails } from './with-voice-details';

describe('withVoiceDetails', () => {
  it('adds the Android details by name and leaves unmatched voices alone', () => {
    const voices = [
      { identifier: 'en-au-x-aua-local', name: 'en-au-x-aua-local', language: 'en-AU' },
      { identifier: 'other', name: 'other', language: 'en-US' },
    ];
    const details = [
      { name: 'en-au-x-aua-local', quality: 400, requiresNetwork: false, installed: false },
    ];

    expect(withVoiceDetails(voices, details)).toEqual([
      { ...voices[0], quality: 400, requiresNetwork: false, installed: false },
      voices[1],
    ]);
  });
});
