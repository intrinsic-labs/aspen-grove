import type { AndroidSpeechNative } from './android-speech-native';

/** A test double for the native module that can fire a focus loss. */
export const fakeAndroidSpeech = () => {
  let lost: (() => void) | null = null;
  const native = {
    requestDuckingFocus: jest.fn(() => Promise.resolve(true)),
    abandonFocus: jest.fn(() => Promise.resolve()),
    getVoiceDetails: jest.fn(() =>
      Promise.resolve([] as Awaited<ReturnType<AndroidSpeechNative['getVoiceDetails']>>)
    ),
    addListener: jest.fn((_event: string, listener: () => void) => {
      lost = listener;
      return { remove: jest.fn() };
    }),
  } satisfies AndroidSpeechNative;
  return { native, loseFocus: () => lost?.() };
};
