import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

const menu = loomUiTokens.contextMenu;

/** Where a message's lifted preview may sit, as insets from the window's edges. */
export type PreviewBounds = {
  /** The preview stays below this: the screen's header. */
  readonly top: number;
  /** Kept clear under the preview: the menu and the bottom safe area. */
  readonly bottom: number;
};

/** The menu's height as UIKit draws it: rows, plus a gap between sections. */
export const estimatedMenuHeight = (
  sections: readonly (readonly unknown[])[]
): number => {
  const groups = sections.filter((section) => section.length > 0);
  const rows = groups.reduce((count, section) => count + section.length, 0);
  if (rows === 0) {
    return 0;
  }
  return (
    rows * menu.rowHeight +
    (groups.length - 1) * menu.sectionGap +
    menu.verticalPadding * 2
  );
};

/**
 * The band a lifted message preview must fit in, as iOS keeps a context
 * menu's preview clear of the navigation bar: below the header, and above
 * the menu that opens under it. A taller message shows its top at full
 * size, cropped to the band with a fade at the cut.
 */
export const messagePreviewBounds = ({
  headerHeight,
  bottomInset,
  sections,
}: {
  readonly headerHeight: number;
  readonly bottomInset: number;
  readonly sections: readonly (readonly unknown[])[];
}): PreviewBounds => ({
  top: headerHeight + menu.previewGap,
  bottom: bottomInset + estimatedMenuHeight(sections) + menu.previewGap * 2,
});
