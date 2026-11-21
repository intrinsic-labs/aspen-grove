import { describe, expect, it } from '@jest/globals';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import { buildMessageMenuSections } from './message-menu';
import {
  estimatedMenuHeight,
  messagePreviewBounds,
} from './message-preview-bounds';

const menu = loomUiTokens.contextMenu;
const sections = buildMessageMenuSections({
  bookmarked: false,
  pruned: false,
  continuationCount: 0,
  isCurrent: true,
});

describe('estimatedMenuHeight', () => {
  it('counts every row, and a gap between sections', () => {
    // The message menu: four sections of two.
    expect(estimatedMenuHeight(sections)).toBe(
      8 * menu.rowHeight + 3 * menu.sectionGap + 2 * menu.verticalPadding
    );
  });

  it('skips empty sections, and is zero for no rows', () => {
    const one = [[{ action: 'a', title: 'A' }], []] as const;
    expect(estimatedMenuHeight(one)).toBe(
      menu.rowHeight + 2 * menu.verticalPadding
    );
    expect(estimatedMenuHeight([])).toBe(0);
  });
});

describe('messagePreviewBounds', () => {
  it('keeps the preview below the header and above the menu', () => {
    const bounds = messagePreviewBounds({
      headerHeight: 116,
      bottomInset: 34,
      sections,
    });
    expect(bounds.top).toBe(116 + menu.previewGap);
    expect(bounds.bottom).toBe(
      34 + estimatedMenuHeight(sections) + 2 * menu.previewGap
    );
  });

  it('leaves room on a phone for a cropped reply to read at full size', () => {
    const bounds = messagePreviewBounds({
      headerHeight: 116,
      bottomInset: 34,
      sections,
    });
    // A reply taller than the band is cropped to it, not scaled: past the
    // 32 pt fade at the cut (ContextMenuView.m), several lines of message
    // text at its normal size still show in full.
    const band = 874 - bounds.top - bounds.bottom;
    const fade = 32;
    const lineHeight =
      (loomUiTokens.typography.defaultMessageFontSize +
        loomUiTokens.typography.cardoSizeOffset) *
      loomUiTokens.typography.messageLineHeightRatio;
    expect(Math.floor((band - fade) / lineHeight)).toBeGreaterThanOrEqual(5);
  });
});
