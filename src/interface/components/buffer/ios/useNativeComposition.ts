import { useEffect } from 'react';
import type { CompositionControl } from '../android/buffer-web-editor-props';
import { bindNativeComposition } from './bind-native-composition';
import { bufferCompositionNative } from './buffer-composition-native';

/**
 * Reports the native input's IME composition to `onComposition` and registers
 * how to end it on `composition`. Does nothing without the native module
 * (Android, Jest).
 */
export const useNativeComposition = (
  composition: CompositionControl,
  onComposition: (composing: boolean) => void
) => {
  useEffect(
    () =>
      bufferCompositionNative
        ? bindNativeComposition(
            bufferCompositionNative,
            composition,
            onComposition
          )
        : undefined,
    [composition, onComposition]
  );
};
