/**
 * Shared dialogue-surface UI tokens. Single source of truth for the loom UI.
 *
 * The values are Latent Spaces' (the SwiftUI reference, `loom-swift`,
 * `fix/phase-1-2` at 02c71d5). Swift sources are cited as `File.swift:line`,
 * relative to `loom-swift/Loom/`. "Measured" means read off an iOS Simulator
 * capture of the reference build (iPhone 17 Pro, iOS 26) where the value is a
 * system default rather than a number in the source.
 *
 * The tree chat (Dialogue) screen is ported against these. The continuation
 * rail and expanded composer tokens are still Aspen Grove's provisional
 * values until those screens are ported.
 */
export const loomUiTokens = {
  colors: {
    // AppColors.swift:13
    green: '#6CBA78',
    // Assets.xcassets/AccentColor: display-p3 (0.781, 0.713, 0.524)
    accentColor: '#C7B686',
    // `.ultraThickMaterial` over the black background (NodeView.swift:201),
    // measured. A user bubble only ever sits on black, so the flat color is
    // the same pixels as the material without a blur view per row.
    userBubbleFill: '#1F1F1F',
    userBubbleFillText: '#fff',
    // `.secondary.opacity(0.8)`, 1 pt (NodeView.swift:202)
    userBubbleOutline: 'rgba(235, 235, 245, 0.48)',
    // Placeholder of the composer's TextField (system placeholder gray), measured.
    composerPlaceholder: 'rgba(235, 235, 245, 0.3)',
    // Latent Spaces' character voices (LoomVoice.swift); Eve uses `green`.
    voiceJefferson: '#A1CDFF',
    voiceLily: '#FFACD0',
  },
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
    // The first row starts right under the navigation bar.
    topPadding: 0,
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
    userBubbleOutlineWidth: 1,
    errorTopMargin: 8,
    sendingBottomSpacer: 2,
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
  header: {
    // `slider.horizontal.3` stands in as Ionicons `options-outline` (no SF
    // Symbols module in the build yet), sized to match its width (measured).
    menuIconSize: 27,
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
