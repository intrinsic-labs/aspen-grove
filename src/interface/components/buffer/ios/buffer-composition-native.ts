import { requireOptionalNativeModule } from 'expo';

/** Sent when the buffer editor's text view gains or loses marked text. */
export const COMPOSITION_CHANGE_EVENT = 'onCompositionChange';

/** The local module in `modules/buffer-composition` (iOS only). */
export interface BufferCompositionNative {
  currentText(): Promise<string | null>;
  addListener(
    event: typeof COMPOSITION_CHANGE_EVENT,
    listener: (event: { readonly composing: boolean }) => void
  ): { remove(): void };
  /** Commits the marked text and ends the composition; resolves whether one was open. */
  endComposition(): Promise<boolean>;
}

/** Null on Android, in Jest and in a build without the module. */
export const bufferCompositionNative =
  requireOptionalNativeModule<BufferCompositionNative>('BufferComposition');
