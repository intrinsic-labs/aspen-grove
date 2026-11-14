import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';

const { frames, initialText, reducedMotionText } =
  loomUiTokens.thinkingIndicator;

/**
 * Stepping logic of Latent Spaces' ThinkingIndicator.swift: the index wraps
 * from the last frame to the first. The text shown before the first tick is
 * `initialText`, which sits outside the loop (index 0 is only reached on the
 * first wrap), as in the reference.
 */
export const nextFrameIndex = (index: number): number =>
  index >= frames.length - 1 ? 0 : index + 1;

export const thinkingText = (
  index: number | null,
  reduceMotion: boolean
): string => {
  if (reduceMotion) {
    return reducedMotionText;
  }
  return index === null ? initialText : (frames[index] ?? initialText);
};
