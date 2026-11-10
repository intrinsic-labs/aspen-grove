import type { LoomVoice } from '@domain/value-objects';
import type {
  ISpeechSynthesizer,
  SpeechEvents,
  SystemVoice,
} from './ISpeechSynthesizer';
import { prepareSpeechText } from './prepare-speech-text';
import { resolveSystemVoice } from './resolve-system-voice';

/** What a listener hears about the utterance it started. */
export interface ReadAloudListener {
  readonly onStart?: () => void;
  /** Finished, stopped or failed: this utterance is no longer playing. */
  readonly onEnd?: () => void;
}

/** Compared by identity: each speak call makes a new one. */
type ActiveUtterance = {
  readonly listener: ReadAloudListener;
};

/**
 * Reads text aloud in a character voice (Latent Spaces' `SpeechSynthesizer`).
 * One utterance plays at a time: starting another stops the current one.
 * Each listener hears `onEnd` exactly once, and only about its own utterance,
 * so a late "stopped" event from the previous one can't touch the next.
 */
export class ReadAloudService {
  private readonly synthesizer: ISpeechSynthesizer;
  private voices: Promise<readonly SystemVoice[]> | null = null;
  private active: ActiveUtterance | null = null;

  constructor(synthesizer: ISpeechSynthesizer) {
    this.synthesizer = synthesizer;
  }

  /** Reads a node's text, with code blocks replaced by a pointer sentence. */
  async speakText(
    content: string,
    voice: LoomVoice,
    listener: ReadAloudListener = {}
  ): Promise<void> {
    const text = prepareSpeechText(content);
    if (text.length === 0) {
      return;
    }
    await this.speak(text, voice, listener);
  }

  /** Plays the persona's sample line, in its own voice and pitch. */
  async demo(voice: LoomVoice, listener: ReadAloudListener = {}) {
    await this.speak(voice.sampleSpeech, voice, listener);
  }

  /** Stops whatever is playing; its listener hears `onEnd` now. */
  async stop(): Promise<void> {
    this.replaceActive(null);
    await this.synthesizer.stop();
  }

  private async speak(
    text: string,
    voice: LoomVoice,
    listener: ReadAloudListener
  ): Promise<void> {
    const utterance: ActiveUtterance = { listener };
    this.replaceActive(utterance);
    await this.synthesizer.stop();

    const resolved = resolveSystemVoice(voice, await this.availableVoices());
    if (this.active !== utterance) {
      return; // Stopped or superseded while the voices loaded.
    }

    this.synthesizer.speak(
      { text, voiceIdentifier: resolved.voiceIdentifier, pitch: voice.pitch },
      this.eventsFor(utterance)
    );
  }

  private eventsFor(utterance: ActiveUtterance): SpeechEvents {
    const end = () => this.finish(utterance);
    return {
      onStart: () => {
        if (this.active === utterance) {
          utterance.listener.onStart?.();
        }
      },
      onDone: end,
      onStopped: end,
      onError: end,
    };
  }

  /** Makes `next` the active utterance, ending the one it replaces. */
  private replaceActive(next: ActiveUtterance | null): void {
    const previous = this.active;
    this.active = next;
    previous?.listener.onEnd?.();
  }

  /** The platform reported this utterance over; ignored once replaced. */
  private finish(utterance: ActiveUtterance): void {
    if (this.active === utterance) {
      this.replaceActive(null);
    }
  }

  /** Loaded once; a failed load is retried next time. */
  private availableVoices(): Promise<readonly SystemVoice[]> {
    if (!this.voices) {
      this.voices = this.synthesizer.getAvailableVoices().catch(() => {
        this.voices = null;
        return [];
      });
    }
    return this.voices;
  }
}
