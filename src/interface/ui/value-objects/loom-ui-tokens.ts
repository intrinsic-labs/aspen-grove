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
    // Latent Spaces' character voices (LoomVoice.swift); Eve uses `green`.
    voiceJefferson: '#A1CDFF',
    voiceLily: '#FFACD0',
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
  // ---------------------------------------------------------------------
  // Settings (Latent Spaces' inset-grouped Forms). Swift sources are in
  // `loom-swift/Loom/presentation/home screen/` (LoomSettingsView.swift,
  // APIKeySettingsView.swift, LoomVoiceChooser.swift, SampleNodeView.swift).
  // "Measured" values are SwiftUI system defaults read off an iPhone 17 Pro
  // (iOS 26) capture of the reference build at 02c71d5.
  // ---------------------------------------------------------------------
  settingsForm: {
    colors: {
      // Form background: systemGroupedBackground, dark (measured #000).
      background: '#000000',
      // Row/card fill: secondarySystemGroupedBackground, dark (measured).
      rowBackground: '#1C1C1E',
      // A sheet's Form sits one level up: #1C1C1E behind #2C2C2E rows
      // (APIKeySettingsView.swift:106-131, measured).
      sheetBackground: '#1C1C1E',
      sheetRowBackground: '#2C2C2E',
      // opaqueSeparator, dark (measured #38383A).
      separator: '#38383A',
      // secondaryLabel / tertiaryLabel, dark: headers, footers, values,
      // chevrons and placeholders (measured).
      secondaryLabel: 'rgba(235, 235, 245, 0.6)',
      tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
      // Off track of a Toggle under a light system appearance, where the
      // native one would be near-white; Latent Spaces' renders (90, 90, 94)
      // on a #1C1C1E row (measured), as the system's dark one does.
      toggleOffTrack: 'rgba(120, 120, 128, 0.67)',
    },
    // Card inset from the screen edge (measured 16).
    sectionInset: 16,
    // Row content inset inside the card (measured 16).
    rowPaddingHorizontal: 16,
    // iOS 26 Form rows are 52 pt tall (measured).
    rowMinHeight: 52,
    // Card corner radius (measured ≈26).
    cardRadius: 26,
    // `Label` icon column: the title starts 72 pt from the screen edge, so
    // 40 pt after the row inset (measured).
    labelIconColumn: 40,
    labelIconSize: 22,
    // A Toggle ends 14 pt from the card's edge, 2 pt past the row inset
    // (measured).
    toggleTrailingOutset: 2,
    // Body text in rows: 17 pt (measured).
    rowTextSize: 17,
    rowTextLineHeight: 22,
    // Section header: 17 pt semibold, secondaryLabel, sentence case
    // (iOS 26 inset-grouped header, measured).
    headerTextSize: 17,
    headerLineHeight: 22,
    // Header glyphs end 11 pt above their card and start 31 pt below the
    // card before (measured); glyphs start 16 pt in.
    headerBottomGap: 9,
    headerTopGap: 27,
    // Footer: footnote 13 pt, secondaryLabel, 16 pt in (measured).
    footerTextSize: 13,
    footerLineHeight: 16,
    footerTopGap: 7,
    // Gap between two sections without header or footer (measured 35).
    sectionGap: 35,
    // Large title: 34 pt bold, 16 pt in (LoomSettingsView.swift:355).
    largeTitleSize: 34,
    largeTitleLineHeight: 41,
    // Title glyphs start 127 pt from the screen top under a 62 pt-tall bar
    // area (measured; Aspen Grove's drawer header is shorter, so this is
    // the gap below it that lands the title at the same height).
    largeTitleTopGap: 19,
    // Toggles and sliders use the accent tint (LoomSettingsView.swift:278,305).
    // Picker rows: value + `chevron.up.chevron.down` in secondaryLabel.
    pickerChevronSize: 15,
    // NavigationLink chevron in tertiaryLabel.
    linkChevronSize: 15,
  },
  settingsPreview: {
    // `VStack(spacing: 10)` of sample nodes (LoomSettingsView.swift:286)
    rowGap: 10,
    // `.padding(.vertical)` around them (LoomSettingsView.swift:294)
    verticalPadding: 16,
    // `.padding(.horizontal, 12)` per node (SampleNodeView.swift:53)
    rowInset: 12,
    // A 65 pt clear spacer before a user node (SampleNodeView.swift:18,24-26)
    // plus the HStack's default 8 pt spacing.
    userLeadingInset: 73,
    // `.padding(8)` inside the bubble (SampleNodeView.swift:38)
    bubblePadding: 8,
    // Latent Spaces asks for Cardo at size + 1.2 (LoomFont.swift:39), but
    // SwiftUI sets it about 1% narrower than React Native; + 1.0 gives the
    // same line breaks (measured, same Cardo-Regular.ttf in both apps).
    cardoSizeOffset: 1.0,
  },
  voiceChooser: {
    // Circle 150, symbol 65 (LoomVoiceChooser.swift:75,81)
    portraitSize: 150,
    portraitIconSize: 65,
    // Cardo 32 name, Calling Code 18 description (LoomVoiceChooser.swift:94,98)
    nameSize: 32,
    descriptionSize: 18,
    descriptionInset: 30,
    // `.padding(.bottom)` under the circle and the name, plus the room
    // SwiftUI's Cardo line box leaves around the glyphs: the name starts
    // 38 pt below the circle and the description 30 pt below the name
    // (measured).
    portraitBottomGap: 32,
    nameBottomGap: 23,
    // Page dots: 8 pt, 10 pt apart, 41 pt above the button (measured).
    dotSize: 8,
    dotGap: 10,
    dotsBottomGap: 41,
    inactiveDot: 'rgba(255, 255, 255, 0.5)',
    // Select capsule: headline bold in `.padding()`, white on dark
    // (LoomVoiceChooser.swift:51-60); 52 pt tall (measured).
    selectHeight: 52,
  },
  apiKeysHero: {
    // `lock.shield.fill` in a 100 pt frame with `.padding(.top)`
    // (APIKeySettingsView.swift:23-28)
    iconSize: 100,
    iconTopPadding: 16,
    // Cardo 28, centered, `.padding(.vertical)` (APIKeySettingsView.swift:29-32)
    titleSize: 28,
    titleVerticalPadding: 16,
    // Bullets in body with `.padding(.vertical, 8)` (APIKeySettingsView.swift:36-48)
    bulletsVerticalPadding: 8,
    // The row's own vertical inset around the VStack (measured ≈14).
    rowVerticalPadding: 14,
  },
  sheetHeader: {
    // iOS 26 toolbar glass capsules in a sheet: 44 pt tall, 16 pt from the
    // edges, 17 pt below the sheet's top edge (measured).
    buttonHeight: 44,
    buttonPaddingHorizontal: 16,
    topPadding: 17,
    sideInset: 16,
    // Body 17 pt labels; title 17 pt semibold.
    textSize: 17,
  },
} as const;
