import { devWarn } from '@infrastructure/logging/dev-log';
import type { AndroidSpeechNative } from './android-speech-native';

type FocusModule = Pick<
  AndroidSpeechNative,
  'requestDuckingFocus' | 'abandonFocus'
>;

/** Lets go of the focus taken for one utterance. */
export type ReleaseFocus = () => void;

/**
 * Android audio focus while speaking, so other apps duck under speech as they
 * do under iOS's duck-others session. Each utterance holds the focus until it
 * ends; a late end from an utterance that was replaced leaves the next one's
 * focus alone. A no-op without the native module (iOS, tests).
 */
export class SpeechAudioFocus {
  private readonly native: FocusModule | null;
  private holder = 0;

  constructor(native: FocusModule | null) {
    this.native = native;
  }

  acquire(): ReleaseFocus {
    const token = ++this.holder;
    this.call(() => this.native?.requestDuckingFocus());
    return () => {
      if (token === this.holder) {
        this.release();
      }
    };
  }

  /** Abandons focus whoever holds it (stop). */
  release(): void {
    this.holder += 1;
    this.call(() => this.native?.abandonFocus());
  }

  private call(action: () => Promise<unknown> | undefined): void {
    void action()?.catch((error: unknown) =>
      devWarn('Speech audio focus failed', error)
    );
  }
}
