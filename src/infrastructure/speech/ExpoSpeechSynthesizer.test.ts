import * as Speech from 'expo-speech';
import { ExpoSpeechSynthesizer } from './ExpoSpeechSynthesizer';

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
});
