/**
 * Shared dialogue-surface UI tokens. Single source of truth for the loom UI
 * (the old `theme.styles` duplicates were merged in here).
 *
 * NOTE: values are provisional — auto-extracted from the Swift prototype and
 * known to have drifted. Reconcile against the prototype source
 * (~/dev/ai/Loom) during the post-beta design pass; keep everything
 * centralized here so that pass stays cheap.
 */
export const loomUiTokens = {
  colors: {
    // Prototype canonical accent colors.
    green: '#6CBA78',
    accentColor: '#C7B686',
    // userBubbleFill: '#ECE5D5',
    userBubbleFill: 'rgba(255, 255, 255, 0.12)',
    // userBubbleFillText: '#101217',
    userBubbleFillText: '#fff',    userBubbleOutline: 'rgba(182, 176, 158, 0.8)',
  },
  layout: {
    horizontalInset: 18,
    inputBarPadding: 10,
  },
  messageList: {
    topPadding: 18,
    rowGap: 18,
    bottomOffset: 8,
    minBottomPadding: 16,
    composerClearancePadding: 12,
    userBubbleMaxWidthPercent: '85%' as const,
    userBubbleRadius: 8,
    userBubblePaddingHorizontal: 10,
    userBubblePaddingVertical: 10,
    userBubbleOutlineWidth: 1,
    messageTextOpacity: 0.9,
    textSize: 17,
    textLineHeight: 27,
    errorTopMargin: 8,
    sendingBottomSpacer: 2,
  },
  composer: {
    topPadding: 10,
    bottomPadding: 8,
    sectionGap: 12,
    editBannerRadius: 8,
    editBannerMinHeight: 30,
    editBannerPaddingHorizontal: 10,
    editBannerIconGap: 6,
    editBannerTextSize: 12,
    editBannerTextLineHeight: 16,
    closeHitSlop: 8,
    inputRowGap: 12,
    inputMinHeight: 44,
    inputCollapsedMaxLines: 5,
    inputControlEdgePadding: 10,
    inputRadius: 8,
    inputTextSize: 17,
    inputTextLineHeight: 27,
    inputVerticalPadding: 10,
    sendButtonSize: 44,
    sendIconSize: 18,
    expandIconSize: 18,
    editIconSize: 14,
    closeIconSize: 16,
    // Merged from the old theme.styles.composer (the values in active use).
    inputRowRadius: 26,
    buttonSize: 28,
  },
  continuationRail: {
    verticalPadding: 8,
    headerVerticalPadding: 4,
    headerBottomMargin: 8,
    hintBottomMargin: 8,
    hintTopMargin: 10,
    hintVerticalPadding: 4,
    emptyVerticalPadding: 10,
    headerLetterSpacing: 0.6,
    contentGap: 10,
    cardWidth: 260,
    cardHeight: 212,
    cardRadius: 10,
    cardPadding: 12,
    cardGap: 8,
    metaLetterSpacing: 0.4,
    previewTextSize: 16,
    previewTextLineHeight: 23,
    previewTextMaxLines: 7,
    useButtonMarginTop: 2,
    useButtonHitSlop: 8,
    closeHitSlop: 10,
  },
} as const;
