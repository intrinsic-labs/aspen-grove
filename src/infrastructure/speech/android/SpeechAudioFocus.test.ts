import { fakeAndroidSpeech } from './fake-android-speech';
import { SpeechAudioFocus } from './SpeechAudioFocus';

describe('SpeechAudioFocus', () => {
  it('requests focus for an utterance and abandons it when it ends', () => {
    const { native } = fakeAndroidSpeech();
    const release = new SpeechAudioFocus(native).acquire();

    expect(native.requestDuckingFocus).toHaveBeenCalledTimes(1);
    release();
    expect(native.abandonFocus).toHaveBeenCalledTimes(1);
  });

  it("ignores a replaced utterance's late end", () => {
    const { native } = fakeAndroidSpeech();
    const focus = new SpeechAudioFocus(native);
    const releaseFirst = focus.acquire();
    focus.release(); // stop() before the next utterance
    const releaseSecond = focus.acquire();

    releaseFirst();
    expect(native.abandonFocus).toHaveBeenCalledTimes(1);
    releaseSecond();
    expect(native.abandonFocus).toHaveBeenCalledTimes(2);
  });

  it('tells the current holder, once, that the focus is lost', () => {
    const { native, loseFocus } = fakeAndroidSpeech();
    const focus = new SpeechAudioFocus(native);
    const first = jest.fn();
    const second = jest.fn();

    focus.acquire(first)();
    focus.acquire(second);
    loseFocus();
    loseFocus();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the native module', () => {
    expect(() => new SpeechAudioFocus(null).acquire()()).not.toThrow();
  });
});
