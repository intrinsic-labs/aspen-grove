import { systemColors } from './colors';

/**
 * The tree chat (Dialogue) screen: message list, composer, header,
 * continuation rail and node sheets.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const dialogueTokens = {
  layout: {
    /** Rail, generate control and expanded composer (not yet ported). */
    horizontalInset: 18,
    // `.padding(8)` around the composer (MessageInputView.swift:52)
    inputBarPadding: 8,
  },
  typography: {
    // Default message size (LoomApp.swift:33)
    defaultMessageFontSize: 17,
    // Latent Spaces asks for Cardo at size + 1.2 (LoomFont.swift:39), but
    // SwiftUI sets it about 1% narrower than React Native does at the same
    // size. Size + 1.0 here matches its line widths, and so its line breaks,
    // exactly (measured, same Cardo-Regular.ttf in both apps).
    cardoSizeOffset: 1.0,
    // SwiftUI keeps the font's natural leading: lines sit 24.33 pt apart at
    // the default size (measured), 1.352 × the 18 pt used here.
    messageLineHeightRatio: 1.352,
  },
  messageList: {
    // Space between the bar and the first row. Latent Spaces sets none in
    // code (LoomTreeContentView.swift:23-73): its ScrollView starts under an
    // iOS 26 bar whose soft scroll edge leaves the first row room to breathe.
    // Aspen Grove's bar ends in a hard edge, so the first row gets SwiftUI's
    // default `.padding()`, the 16 pt Latent Spaces also leaves under the
    // current node (NodeView.swift:121).
    topPadding: 16,
    // `VStack(spacing: 10)` (LoomTreeContentView.swift:24)
    rowGap: 10,
    // `.padding(.horizontal, 12)` on every row (NodeView.swift:115)
    rowInset: 12,
    // Text inset inside a row: user `.padding(8)` (NodeView.swift:197),
    // model `.padding(8)` (CodeBlockView.swift:36)
    messagePadding: 8,
    // Caption `.padding(.horizontal, 4)` (NodeView.swift:97-108)
    captionInset: 4,
    // A clear 65 pt spacer before a user row (NodeView.swift:58,63-67) plus
    // the HStack's default 8 pt spacing.
    userRowLeadingInset: 73,
    // A model row ends in a Spacer, which keeps the HStack's default 8 pt
    // spacing after the text (NodeView.swift:109-111).
    modelRowTrailingInset: 8,
    // `.padding(.bottom, 50)` under the rows (LoomTreeContentView.swift:73)
    scrollBottomPadding: 50,
    // Where the last line's box ends relative to the top of the composer
    // (its transparent 8 pt top padding included), at the bottom of a tree.
    // Measured: Latent Spaces rests the last line's glyphs 18 pt above the
    // field, which puts Cardo's line box 2 pt into that padding.
    composerClearance: -2,
    bottomOffset: 8,
    // NodeView.swift:33
    messageTextOpacity: 0.9,
    // A system node: `Color.primary.opacity(0.6)` (NodeView.swift:33),
    // centered (`.center` alignment and no Spacer, NodeView.swift:42-43,
    // 62-67,111-113), in the message font (NodeView.swift:193-194) with
    // `.padding(8)` (NodeView.swift:197) and no bubble: only `.user` draws a
    // background (NodeView.swift:198-203).
    systemTextOpacity: 0.6,
    userBubbleOutlineWidth: 1,
    errorTopMargin: 8,
  },
  // The thinking indicator (ThinkingIndicator.swift), shown under the last
  // message from the request's start until the stream ends
  // (LoomTreeContentView.swift:62-70, LLMManager.swift:14,50,89,102).
  thinkingIndicator: {
    // The 0 bounces along five cells; the timer fires every 0.1 s and the
    // text starts at "0••••" (ThinkingIndicator.swift).
    frames: [
      '•0•••',
      '••0••',
      '•••0•',
      '••••0',
      '•••0•',
      '••0••',
      '•0•••',
      '0••••',
    ],
    // Shown before the first tick, while the index is 0, so the first tick
    // lands on frames[1] exactly as in the reference.
    initialText: '0••••',
    intervalMs: 100,
    // Shown instead of the animation when the OS asks for reduced motion (AG).
    reducedMotionText: '•••••',
    // Calling Code Regular 16 (ThinkingIndicator.swift). Calling Code isn't
    // bundled; IBM Plex Mono stands in for it, as elsewhere in AG.
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 16,
    lineHeight: 22,
    // `.padding([.bottom, .horizontal])` (LoomTreeContentView.swift:62-70):
    // the horizontal 16 pt is the row inset (12) plus 4 more here.
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  composer: {
    // `.clipShape(RoundedRectangle(cornerRadius: 20))` (MessageField.swift:73)
    fieldRadius: 20,
    // `.padding(.vertical, 12)`, `.padding(.leading, 16)` (MessageField.swift:42-44)
    textPaddingVertical: 12,
    textPaddingLeading: 16,
    // `.font(.title2)` symbol in `.padding(10)` (MessageField.swift:62-69)
    // Sized so the circle matches the reference's title2 symbol (measured).
    sendIconSize: 26,
    sendButtonPadding: 10,
    // Green stroke only while focused (MessageInputView.swift:47-50)
    focusedStrokeWidth: 1,
    // `.shadow(radius: 15)` (MessageInputView.swift:51); SwiftUI's default
    // shadow color is black at 0.33.
    shadowRadius: 15,
    shadowOpacity: 0.33,
    shadowColor: systemColors.black,
    // Grows to five lines, then scrolls and offers the expanded composer (AG).
    inputCollapsedMaxLines: 5,
    sectionGap: 12,
    editBannerMinHeight: 30,
    editBannerPaddingHorizontal: 10,
    editBannerIconGap: 6,
    editBannerTextSize: 12,
    editBannerTextLineHeight: 16,
    closeHitSlop: 8,
    inputMinHeight: 44,
    inputControlEdgePadding: 10,
    expandIconSize: 18,
    editIconSize: 14,
    closeIconSize: 16,
  },
  // The screen fades to black over its last 10% (MessageInputView.swift:24-34).
  bottomFade: {
    clearUntil: 0.9,
  },
  // Android's stand-in for a transparent header's scroll-edge effect
  // (HeaderScrollEdge): black behind the bar, fading out over this much
  // below it.
  headerScrollEdge: {
    fadeHeight: 24,
  },
  header: {
    // `slider.horizontal.3` stands in as Ionicons `options-outline` (no SF
    // Symbols module in the build yet), sized to match its width (measured).
    menuIconSize: 27,
    // Every `···` menu sits in a round glass button, which already draws the
    // circle, so it is the plain `ellipsis`, not `ellipsis.circle`: Ionicons
    // `ellipsis-horizontal`, sized so its dots span about half the circle.
    ellipsisSize: 22,
  },
  // The continuations row under a node (ChildNodesView.swift) and its cards
  // (ChildNodeView.swift).
  continuationRail: {
    // The hint: Calling Code 14, gray, centered, `.padding([.top,
    // .horizontal])` (ChildNodesView.swift:16-20). IBM Plex Mono stands in.
    hintFontFamily: 'IBMPlexMono-Regular',
    hintTextSize: 14,
    hintLineHeight: 18,
    hintPadding: 16,
    // `HStack(spacing: 22)` in `.padding()`, then `.padding(.bottom, 18)`
    // and a Divider with `.padding(.bottom, 22)` (ChildNodesView.swift:21-31).
    cardSpacing: 22,
    rowPadding: 16,
    rowBottomPadding: 18,
    dividerBottomMargin: 22,
    // SwiftUI `.gray`, the hint's and the caption's color.
    gray: '#8E8E93',
    // `.secondary`, dark: the caption's `[n]`.
    secondary: 'rgba(235, 235, 245, 0.6)',
    // `VStack(spacing: 8)`: caption over card (ChildNodeView.swift:19).
    captionGap: 8,
    // `.caption.italic()` (ChildNodeView.swift:27-32); the HStack's default
    // 8 pt spacing between check, model and count.
    captionTextSize: 12,
    captionItemGap: 8,
    // `checkmark.circle.fill` in `.caption`, AppColors.green.
    captionCheckSize: 13,
    // Text 275 wide in `.padding(8)`, `cornerRadius: 4`, at most 7 lines
    // (ChildNodeView.swift:34-41).
    cardWidth: 275,
    cardPadding: 8,
    cardRadius: 4,
    previewTextMaxLines: 7,
    // `Color.orange.saturation(0.3)` (ChildNodeView.swift:39), measured.
    cardFill: '#BE9D80',
    // `AppColors.oppositePrimary.opacity(0.8)`: black at 0.8 in dark mode.
    cardText: 'rgba(0, 0, 0, 0.8)',
    // `.transition(.scale)` with the rail's easeInOut 0.3 toggle
    // (ChildNodesView.swift:32, LoomTreeContentView.swift:40).
    transitionMs: 300,
    // AG's streaming cards: the stop control and the failed card's dimming.
    stopHitSlop: 10,
    stopIconSize: 20,
    failedOpacity: 0.75,
    emptyVerticalPadding: 10,
  },
  // A node's sheet: "Node Info" (NodeSheetView.swift) and "Continuation
  // Node" (ChildNodeView.swift:53-96).
  // Markdown in a message (AG: Latent Spaces shows Markdown as plain text).
  markdown: {
    // A fenced code block's fill, AG's black. Latent Spaces fills code
    // snippets with `.secondary.opacity(0.08)` (CodeBlockView.swift:104).
    codeBlockBackground: systemColors.black,
  },
  nodeSheet: {
    // The sheet background (systemBackground, elevated, dark), measured.
    background: '#1C1C1E',
    // Glass circles: `chevron.left` and `ellipsis` in the toolbar, 44 pt,
    // 16 pt from the edges, 17 pt below the sheet's top (measured).
    circleSize: 44,
    chevronSize: 22,
    // Title `.headline`, subtitle `.caption` in `.secondary`.
    titleSize: 17,
    subtitleSize: 12,
    subtitleGap: 2,
    subtitleItemGap: 8,
    // Text in `.padding()` plus the code block's own `.padding(8)`
    // (NodeSheetView.swift:22-23, CodeBlockView.swift:36).
    textInset: 24,
    // The toolbar's bottom to the first line, measured on shot 23.
    textTopGap: 32,
    // Aspen Grove's details under the text (metadata, generation, provenance).
    detailsGap: 22,
    detailsRowGap: 8,
    detailsTextSize: 12,
    detailsLabelSpacing: 0.7,
  },
} as const;
