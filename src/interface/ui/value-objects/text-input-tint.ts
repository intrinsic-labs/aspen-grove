import { loomUiTokens } from './loom-ui-tokens';

/**
 * Text field tint: Latent Spaces' `AccentColor` asset (display P3
 * 0.781 / 0.713 / 0.524, the gold accent), which SwiftUI applies to every
 * field's caret and selection. Also used for the native header search bar.
 */
export const textInputTint = {
  caret: loomUiTokens.colors.accentColor,
  // The accent at 40%, for Android's selection highlight.
  androidHighlight: 'rgba(199, 182, 134, 0.4)',
} as const;
