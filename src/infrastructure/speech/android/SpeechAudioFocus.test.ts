import { SpeechAudioFocus } from './SpeechAudioFocus';

const nativeFocus = () => ({
  requestDuckingFocus: jest.fn(() => Promise.resolve(true)),
  abandonFocus: jest.fn(() => Promise.resolve()),
});

describe('SpeechAudioFocus', () => {
  it('requests focus for an utterance and abandons it when it ends', () => {
    const native = nativeFocus();
    const release = new SpeechAudioFocus(native).acquire();

    expect(native.requestDuckingFocus).toHaveBeenCalledTimes(1);
    release();
    expect(native.abandonFocus).toHaveBeenCalledTimes(1);
  });

  it("ignores a replaced utterance's late end", () => {
    const native = nativeFocus();
    const focus = new SpeechAudioFocus(native);
    const releaseFirst = focus.acquire();
    focus.release(); // stop() before the next utterance
    const releaseSecond = focus.acquire();

    releaseFirst();
    expect(native.abandonFocus).toHaveBeenCalledTimes(1);
    releaseSecond();
    expect(native.abandonFocus).toHaveBeenCalledTimes(2);
  });

  it('does nothing without the native module', () => {
    expect(() => new SpeechAudioFocus(null).acquire()()).not.toThrow();
  });
});
