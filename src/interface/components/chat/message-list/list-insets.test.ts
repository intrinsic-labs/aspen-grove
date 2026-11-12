import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import {
  keyboardExtraSpace,
  messageListBottomPadding,
  visibleContentBottom,
} from './list-insets';

const { composerClearance, messagePadding, scrollBottomPadding } =
  loomUiTokens.messageList;

describe('messageListBottomPadding', () => {
  it('rests the last line composerClearance above the composer', () => {
    const composerHeight = 98;
    // The row's own bottom padding makes up the rest of the gap.
    expect(messageListBottomPadding(composerHeight) + messagePadding).toBe(
      composerHeight + composerClearance
    );
  });

  it('grows with the composer', () => {
    expect(messageListBottomPadding(200)).toBeGreaterThan(
      messageListBottomPadding(98)
    );
  });

  it('falls back to the plain bottom padding before the composer is measured', () => {
    expect(messageListBottomPadding(0)).toBe(scrollBottomPadding);
  });
});

describe('visibleContentBottom', () => {
  it('stops above the composer and its clearance', () => {
    expect(visibleContentBottom(100, 800, 98)).toBe(
      100 + 800 - 98 - composerClearance
    );
  });
});

describe('keyboardExtraSpace', () => {
  it('gives back the safe area the keyboard covers', () => {
    expect(keyboardExtraSpace(34)).toBe(-34);
  });
});
