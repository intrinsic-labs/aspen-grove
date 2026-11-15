import type { BlurTint } from 'expo-blur';

/**
 * The app is dark only, so only the dark system material is defined; the
 * light variants it once had could no longer be reached.
 */
export type BlurVariant = 'systemThinDark';

interface BlurConfig {
  intensity: number;
  tint: BlurTint;
  /** Android has no system materials: a flat overlay stands in. */
  overlayColor: string;
}

export const blurVariants: Record<BlurVariant, BlurConfig> = {
  // SwiftUI `.thinMaterial` in the dark scheme (Latent Spaces' composer,
  // MessageField.swift:72). Full intensity is the system material as is;
  // over black it reads #1F1F1F, like the reference.
  systemThinDark: {
    intensity: 100,
    tint: 'systemThinMaterialDark',
    overlayColor: 'rgba(31,31,31,0.85)',
  },
};
