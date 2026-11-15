import type { BlurMethod } from 'expo-blur';

/**
 * How a material blurs. iOS uses its system material and ignores the method.
 * Android blurs only with a target to sample: with one, a real blur
 * (Android 12+, where it is cheap; older versions get the flat fallback);
 * without one, `none`, the flat tinted fallback, chosen outright rather than
 * left to expo-blur's warning.
 */
export const materialBlurMethod = (
  platform: string,
  hasTarget: boolean
): BlurMethod =>
  platform === 'android' && hasTarget ? 'dimezisBlurViewSdk31Plus' : 'none';
