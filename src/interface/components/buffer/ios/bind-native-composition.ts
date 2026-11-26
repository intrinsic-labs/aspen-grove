import type { CompositionControl } from '../composition-barrier';
import {
  COMPOSITION_CHANGE_EVENT,
  type BufferCompositionNative,
} from './buffer-composition-native';

/**
 * Feeds the native input's marked-text state to the composition barrier and
 * gives the barrier a way to end a composition: the iOS side of what the
 * Android page does over its bridge. Returns the unbinding.
 */
export const bindNativeComposition = (
  native: BufferCompositionNative,
  composition: Pick<CompositionControl, 'end'>,
  onComposition: (composing: boolean) => void
): (() => void) => {
  const subscription = native.addListener(
    COMPOSITION_CHANGE_EVENT,
    ({ composing }) => onComposition(composing)
  );
  composition.end = () => {
    // A failed request is not an answer; the barrier's fallback timer runs
    // the held action. A resolved `false` means nothing was composing.
    native.endComposition().then(
      (wasComposing) => {
        if (!wasComposing) onComposition(false);
      },
      () => {}
    );
  };
  return () => {
    subscription.remove();
    composition.end = () => {};
  };
};
