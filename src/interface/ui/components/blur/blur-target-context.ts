import { createContext, type RefObject, useContext } from 'react';
import type { View } from 'react-native';

/** The view a screen's materials blur on Android (expo-blur `blurTarget`). */
export type BlurTargetRef = RefObject<View | null>;

export const BlurTargetContext = createContext<BlurTargetRef | null>(null);

/** The enclosing screen's blur target, or null outside a `BlurTargetScope`. */
export const useBlurTarget = (): BlurTargetRef | null =>
  useContext(BlurTargetContext);
