import { DEFAULT_LOOM_VOICE, findLoomVoice } from './loom-voice';

describe('findLoomVoice', () => {
  it('gives a new user Lily, as Latent Spaces does on first launch', () => {
    expect(DEFAULT_LOOM_VOICE.name).toBe('Lily');
    expect(findLoomVoice(null).name).toBe('Lily');
    expect(findLoomVoice(undefined).name).toBe('Lily');
    expect(findLoomVoice('').name).toBe('Lily');
  });

  it('keeps a saved choice', () => {
    expect(findLoomVoice('Jefferson').name).toBe('Jefferson');
    expect(findLoomVoice('Eve').name).toBe('Eve');
    expect(findLoomVoice('Lily').name).toBe('Lily');
  });

  it('falls back to Jefferson for a saved name it does not know', () => {
    expect(findLoomVoice('Nobody').name).toBe('Jefferson');
  });
});
