import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import {
  BOTTOM_PIN_TOLERANCE,
  isAtListBottom,
  keyboardExtraSpace,
  offsetForComposerGrowth,
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

describe('isAtListBottom', () => {
  it('is true at the end of the content', () => {
    expect(
      isAtListBottom({
        offsetY: 1200,
        viewportHeight: 800,
        contentHeight: 2000,
      })
    ).toBe(true);
  });

  it('allows a little slack above the end', () => {
    expect(
      isAtListBottom({
        offsetY: 1200 - BOTTOM_PIN_TOLERANCE,
        viewportHeight: 800,
        contentHeight: 2000,
      })
    ).toBe(true);
  });

  it('is false further up', () => {
    expect(
      isAtListBottom({ offsetY: 900, viewportHeight: 800, contentHeight: 2000 })
    ).toBe(false);
  });

  it('is false before the list has been measured', () => {
    expect(
      isAtListBottom({ offsetY: 0, viewportHeight: 0, contentHeight: 0 })
    ).toBe(false);
  });
});

describe('offsetForComposerGrowth', () => {
  it('keeps a reader at the bottom there as the draft grows', () => {
    expect(
      offsetForComposerGrowth({
        offsetY: 1422,
        previousComposerHeight: 147,
        composerHeight: 195,
        wasAtBottom: true,
      })
    ).toBe(1422 + 48);
  });

  it('leaves a reader further up where they are', () => {
    expect(
      offsetForComposerGrowth({
        offsetY: 400,
        previousComposerHeight: 147,
        composerHeight: 195,
        wasAtBottom: false,
      })
    ).toBeNull();
  });

  it('does nothing when the composer shrinks', () => {
    expect(
      offsetForComposerGrowth({
        offsetY: 1422,
        previousComposerHeight: 195,
        composerHeight: 98,
        wasAtBottom: true,
      })
    ).toBeNull();
  });

  it('does nothing on the first measurement', () => {
    expect(
      offsetForComposerGrowth({
        offsetY: 0,
        previousComposerHeight: 0,
        composerHeight: 98,
        wasAtBottom: true,
      })
    ).toBeNull();
  });
});
