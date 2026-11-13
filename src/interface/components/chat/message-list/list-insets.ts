import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

const { composerClearance, messagePadding, scrollBottomPadding } =
  loomUiTokens.messageList;

/**
 * Space under the last row so its text rests `composerClearance` above the
 * composer, as at the bottom of a Latent Spaces tree. The row's own text
 * padding already sits below the last line. Before the composer has been
 * measured, Latent Spaces' plain bottom padding stands in
 * (LoomTreeContentView.swift:73).
 */
export const messageListBottomPadding = (composerHeight: number): number =>
  composerHeight > 0
    ? composerHeight + composerClearance - messagePadding
    : scrollBottomPadding;

/**
 * Space the list adds over the keyboard's height while it is up. The bottom
 * padding already clears the composer, safe area included; the keyboard
 * covers that safe area (the composer drops its padding for it), so take it
 * back out. The last line then rests as far above the composer as when the
 * keyboard is down, as in Latent Spaces.
 */
export const keyboardExtraSpace = (safeAreaBottom: number): number =>
  -safeAreaBottom;

/** The bottom edge of the readable area, in content coordinates. */
export const visibleContentBottom = (
  offsetY: number,
  viewportHeight: number,
  composerHeight: number
): number => offsetY + viewportHeight - composerHeight - composerClearance;
