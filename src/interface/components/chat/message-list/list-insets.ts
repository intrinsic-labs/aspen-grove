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

/**
 * How close to the end of the content still counts as "at the bottom": a
 * line's worth, so a reader resting a little above the end is kept there too.
 */
export const BOTTOM_PIN_TOLERANCE = 24;

/** Whether the viewport shows the end of the content. */
export const isAtListBottom = (metrics: {
  readonly offsetY: number;
  readonly viewportHeight: number;
  readonly contentHeight: number;
}): boolean =>
  metrics.viewportHeight > 0 &&
  metrics.offsetY + metrics.viewportHeight >=
    metrics.contentHeight - BOTTOM_PIN_TOLERANCE;

/**
 * Where to scroll when the composer changes height. The bottom padding grows
 * with the composer, but the scroll offset doesn't follow by itself, so a
 * draft growing to several lines slid over the last message. A reader at the
 * bottom stays there: the offset moves up by the growth. Away from the bottom,
 * or when the composer shrinks (the scroll view clamps on its own), nothing
 * moves: null.
 */
export const offsetForComposerGrowth = ({
  offsetY,
  previousComposerHeight,
  composerHeight,
  wasAtBottom,
}: {
  readonly offsetY: number;
  readonly previousComposerHeight: number;
  readonly composerHeight: number;
  readonly wasAtBottom: boolean;
}): number | null => {
  const growth = composerHeight - previousComposerHeight;
  if (!wasAtBottom || growth <= 0 || previousComposerHeight <= 0) {
    return null;
  }
  return offsetY + growth;
};
