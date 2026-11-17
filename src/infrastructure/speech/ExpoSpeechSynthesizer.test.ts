import * as Speech from 'expo-speech';
import { JEFFERSON_VOICE } from '@domain/value-objects';
import { ReadAloudService } from '@application/services/speech';
import { fakeAndroidSpeech } from './android/fake-android-speech';
import { ExpoSpeechSynthesizer } from './ExpoSpeechSynthesizer';

jest.mock('@infrastructure/logging/dev-log', () => ({
  devLog: jest.fn(),
  devWarn: jest.fn(),
}));
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-speech', () => ({
  maxSpeechInputLength: 40,
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

type SpeakOptions = {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
};

const speak = Speech.speak as jest.Mock;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const utterance = (text: string) => ({ text, voiceIdentifier: 'v', pitch: 1 });
const optionsAt = (call: number) => speak.mock.calls[call][1] as SpeakOptions;

describe('ExpoSpeechSynthesizer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queues a reply over the engine limit as pieces read as one', async () => {
    const events = { onStart: jest.fn(), onDone: jest.fn() };
    new ExpoSpeechSynthesizer().speak(
      utterance('First sentence here. Second sentence here. Third one.'),
      events
    );
    await flush();

    expect(speak.mock.calls.length).toBeGreaterThan(1);
    for (const [text] of speak.mock.calls) {
      expect((text as string).length).toBeLessThanOrEqual(40);
    }
    optionsAt(0).onStart?.();
    optionsAt(0).onDone?.();
    expect(events.onStart).toHaveBeenCalledTimes(1);
    expect(events.onDone).not.toHaveBeenCalled();
    optionsAt(speak.mock.calls.length - 1).onDone?.();
    expect(events.onDone).toHaveBeenCalledTimes(1);
  });

  it('settles once when stopped mid-queue', async () => {
    const events = { onStopped: jest.fn() };
    new ExpoSpeechSynthesizer().speak(
      utterance('First sentence here. Second sentence here. Third one.'),
      events
    );
    await flush();
    speak.mock.calls.forEach((_, index) => optionsAt(index).onStopped?.());
    expect(events.onStopped).toHaveBeenCalledTimes(1);
  });

  it('reports a thrown speak as an error instead of hanging', async () => {
    speak.mockImplementationOnce(() => {
      throw new Error('SpeechInputIsToLongException');
    });
    const events = { onError: jest.fn(), onDone: jest.fn() };
    new ExpoSpeechSynthesizer().speak(utterance('Short.'), events);
    await flush();
    expect(events.onError).toHaveBeenCalledWith(
      new Error('SpeechInputIsToLongException')
    );
    expect(events.onDone).not.toHaveBeenCalled();
  });

  it('holds Android audio focus from the first piece until the utterance settles', async () => {
    const { native: android } = fakeAndroidSpeech();
    new ExpoSpeechSynthesizer(android).speak(
      utterance('First sentence here. Second sentence here. Third one.'),
      {}
    );
    await flush();

    expect(android.requestDuckingFocus).toHaveBeenCalledTimes(1);
    optionsAt(0).onDone?.();
    expect(android.abandonFocus).not.toHaveBeenCalled();
    optionsAt(speak.mock.calls.length - 1).onDone?.();
    expect(android.abandonFocus).toHaveBeenCalledTimes(1);
  });

  it('abandons Android audio focus on stop', async () => {
    const { native: android } = fakeAndroidSpeech();
    const synthesizer = new ExpoSpeechSynthesizer(android);
    synthesizer.speak(utterance('Short.'), {});
    await flush();
    await synthesizer.stop();

    expect(android.abandonFocus).toHaveBeenCalledTimes(1);
  });

  it('reports Android voices with their installed and network details', async () => {
    (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'en-gb-x-gbd-local',
        name: 'en-gb-x-gbd-local',
        language: 'en-GB',
        quality: 'Enhanced',
      },
    ]);
    const { native: android } = fakeAndroidSpeech();
    android.getVoiceDetails.mockResolvedValueOnce([
      {
        name: 'en-gb-x-gbd-local',
        quality: 400,
        requiresNetwork: false,
        installed: false,
      },
    ]);

    await expect(
      new ExpoSpeechSynthesizer(android).getAvailableVoices()
    ).resolves.toEqual([
      {
        identifier: 'en-gb-x-gbd-local',
        name: 'en-gb-x-gbd-local',
        language: 'en-GB',
        quality: 400,
        requiresNetwork: false,
        installed: false,
      },
    ]);
  });

  it('ends the reading as stopped when another app takes the focus for good', async () => {
    const { native: android, loseFocus } = fakeAndroidSpeech();
    const service = new ReadAloudService(new ExpoSpeechSynthesizer(android));
    const listener = { onEnd: jest.fn() };

    await service.speakText('Short.', JEFFERSON_VOICE, listener);
    await flush();
    loseFocus();
    // The engine then reports the stop, which must not end it twice.
    optionsAt(0).onStopped?.();

    expect(listener.onEnd).toHaveBeenCalledTimes(1);
    expect(Speech.stop).toHaveBeenCalled();
    expect(android.abandonFocus).toHaveBeenCalled();
  });
});
