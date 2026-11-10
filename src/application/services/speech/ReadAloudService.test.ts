import { JEFFERSON_VOICE, LILY_VOICE } from '@domain/value-objects';
import type {
  ISpeechSynthesizer,
  SpeechEvents,
  SpeechUtterance,
  SystemVoice,
} from './ISpeechSynthesizer';
import { CODE_BLOCK_SPEECH } from './prepare-speech-text';
import { ReadAloudService } from './ReadAloudService';

class FakeSynthesizer implements ISpeechSynthesizer {
  readonly spoken: { utterance: SpeechUtterance; events: SpeechEvents }[] = [];
  stopCount = 0;
  voiceLoads = 0;
  voices: readonly SystemVoice[] = [
    { identifier: 'gb.daniel', name: 'Daniel', language: 'en-GB' },
  ];

  speak(utterance: SpeechUtterance, events: SpeechEvents): void {
    this.spoken.push({ utterance, events });
  }

  async stop(): Promise<void> {
    this.stopCount += 1;
  }

  async getAvailableVoices(): Promise<readonly SystemVoice[]> {
    this.voiceLoads += 1;
    return this.voices;
  }
}

describe('ReadAloudService', () => {
  it('speaks prepared text in the resolved voice and pitch', async () => {
    const synthesizer = new FakeSynthesizer();
    const service = new ReadAloudService(synthesizer);

    await service.speakText('See:\n```ts\nx\n```', JEFFERSON_VOICE);

    expect(synthesizer.spoken[0].utterance).toEqual({
      text: `See:\n${CODE_BLOCK_SPEECH}`,
      voiceIdentifier: 'gb.daniel',
      pitch: 1.0,
    });
  });

  it("demos a persona's sample line with that persona's pitch", async () => {
    const synthesizer = new FakeSynthesizer();
    const service = new ReadAloudService(synthesizer);

    await service.demo(LILY_VOICE);

    expect(synthesizer.spoken[0].utterance).toEqual({
      text: LILY_VOICE.sampleSpeech,
      voiceIdentifier: undefined,
      pitch: 1.075,
    });
  });

  it('skips empty text without speaking', async () => {
    const synthesizer = new FakeSynthesizer();
    await new ReadAloudService(synthesizer).speakText(' \n', JEFFERSON_VOICE);

    expect(synthesizer.spoken).toHaveLength(0);
  });

  it('stops the current utterance before the next and ends its listener once', async () => {
    const synthesizer = new FakeSynthesizer();
    const service = new ReadAloudService(synthesizer);
    const first = { onStart: jest.fn(), onEnd: jest.fn() };
    const second = { onStart: jest.fn(), onEnd: jest.fn() };

    await service.speakText('one', JEFFERSON_VOICE, first);
    synthesizer.spoken[0].events.onStart?.();
    await service.speakText('two', JEFFERSON_VOICE, second);
    // The platform reports the first utterance stopped after the switch.
    synthesizer.spoken[0].events.onStopped?.();

    expect(first.onStart).toHaveBeenCalledTimes(1);
    expect(first.onEnd).toHaveBeenCalledTimes(1);
    expect(second.onEnd).not.toHaveBeenCalled();
    expect(synthesizer.stopCount).toBe(2);

    synthesizer.spoken[1].events.onDone?.();
    expect(second.onEnd).toHaveBeenCalledTimes(1);
  });

  it('ends the listener on stop and loads voices once', async () => {
    const synthesizer = new FakeSynthesizer();
    const service = new ReadAloudService(synthesizer);
    const listener = { onEnd: jest.fn() };

    await service.speakText('one', JEFFERSON_VOICE, listener);
    await service.stop();
    await service.demo(JEFFERSON_VOICE);

    expect(listener.onEnd).toHaveBeenCalledTimes(1);
    expect(synthesizer.voiceLoads).toBe(1);
  });
});

describe('ReadAloudService overlapping requests', () => {
  it('ends a request superseded while the voices load', async () => {
    const synthesizer = new FakeSynthesizer();
    const service = new ReadAloudService(synthesizer);
    const first = { onEnd: jest.fn() };
    const second = { onEnd: jest.fn() };

    const firstRequest = service.speakText('one', JEFFERSON_VOICE, first);
    const secondRequest = service.speakText('two', JEFFERSON_VOICE, second);
    await Promise.all([firstRequest, secondRequest]);

    expect(first.onEnd).toHaveBeenCalledTimes(1);
    expect(second.onEnd).not.toHaveBeenCalled();
    expect(synthesizer.spoken.map((s) => s.utterance.text)).toEqual(['two']);
  });
});
