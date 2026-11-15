import { type ReactNode, useRef } from 'react';
import type { View } from 'react-native';
import { BlurTargetContext } from './blur-target-context';

/**
 * Gives a screen one blur target: its `BlurTarget` holds the content, and
 * the `MaterialView`s floating over it (the composer) blur that content.
 * Android's expo-blur needs it to blur at all (SDK 57); iOS blurs whatever is
 * behind and ignores it.
 */
export const BlurTargetScope = ({ children }: { children: ReactNode }) => {
  const target = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={target}>
      {children}
    </BlurTargetContext.Provider>
  );
};
