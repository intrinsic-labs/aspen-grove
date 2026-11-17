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

  it('leaves a usable band on a phone', () => {
    const bounds = messagePreviewBounds({
      headerHeight: 116,
      bottomInset: 34,
      sections,
    });
    const band = 874 - bounds.top - bounds.bottom;
    expect(band).toBeGreaterThan(200);
  });
});
