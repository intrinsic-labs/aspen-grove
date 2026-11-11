import type { BlurTint } from 'expo-blur';

export type BlurVariant =
  | 'ultraThin'
  | 'thin'
  | 'regular'
  | 'thick'
  | 'systemThinDark';

interface BlurConfig {
  intensity: number;
  tint: BlurTint;
  /** Android has no system materials: a flat overlay stands in. */
  overlayColor: string;
}

export const blurVariants: Record<BlurVariant, BlurConfig> = {
  ultraThin: {
    intensity: 25,
    tint: 'light',
    overlayColor: 'rgba(242,242,242,0.15)',
  },
  thin: {
    intensity: 45,
    tint: 'light',
    overlayColor: 'rgba(242,242,242,0.25)',
  },
  regular: {
    intensity: 65,
    tint: 'light',
    overlayColor: 'rgba(242,242,242,0.35)',
  },
  thick: {
    intensity: 85,
    tint: 'light',
    overlayColor: 'rgba(242,242,242,0.5)',
  },
  // SwiftUI `.thinMaterial` in the dark scheme (Latent Spaces' composer,
  // MessageField.swift:72). Full intensity is the system material as is;
  // over black it reads #1F1F1F, like the reference.
  systemThinDark: {
    intensity: 100,
    tint: 'systemThinMaterialDark',
    overlayColor: 'rgba(31,31,31,0.85)',
  },
};
