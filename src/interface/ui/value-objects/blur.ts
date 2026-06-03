export type BlurVariant = 'ultraThin' | 'thin' | 'regular' | 'thick';

interface BlurConfig {
  intensity: number;
  tint: 'light' | 'dark' | 'default' | 'prominent';
  overlayOpacity: number; // fine-tune Android parity
}

export const blurVariants: Record<BlurVariant, BlurConfig> = {
  ultraThin: { intensity: 25,  tint: 'light', overlayOpacity: 0.15 },
  thin:      { intensity: 45,  tint: 'light', overlayOpacity: 0.25 },
  regular:   { intensity: 65,  tint: 'light', overlayOpacity: 0.35 },
  thick:     { intensity: 85,  tint: 'light', overlayOpacity: 0.5  },
};