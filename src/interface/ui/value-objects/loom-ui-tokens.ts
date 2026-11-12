/**
 * Shared dialogue-surface UI tokens. Single source of truth for the loom UI.
 *
 * The values are Latent Spaces' (the SwiftUI reference, `loom-swift`,
 * `fix/phase-1-2` at 02c71d5). Swift sources are cited as `File.swift:line`,
 * relative to `loom-swift/Loom/`. "Measured" means read off an iOS Simulator
 * capture of the reference build (iPhone 17 Pro, iOS 26) where the value is a
 * system default rather than a number in the source.
 *
 * The tree chat (Dialogue) screen, its continuation row and node sheets are
 * ported against these. The expanded composer tokens are still Aspen
 * Grove's provisional values until that screen is ported.
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
  nodeSheet: {
    // The sheet background (systemBackground, elevated, dark), measured.
    background: '#1C1C1E',
    // Glass circles: `chevron.left` and `ellipsis.circle` in the toolbar,
    // 44 pt, 16 pt from the edges, 17 pt below the sheet's top (measured).
    circleSize: 44,
    chevronSize: 22,
    ellipsisSize: 26,
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
  // ---------------------------------------------------------------------
  // Home (HomeScreenView.swift, DateHeaderView.swift, both relative to
  // `loom-swift/Loom/presentation/`). "Measured" values are read off
  // `01-home.png` (iPhone 17 Pro, iOS 26, 402 × 874 pt).
  // ---------------------------------------------------------------------
  home: {
    greeting: {
      // `.font(.custom("Cardo", size: 36))` (DateHeaderView.swift:15)
      fontSize: 36,
      // Lines sit 49 pt apart (measured).
      lineHeight: 49,
      // `.padding(.vertical)` + `.padding(.top, 20)` (DateHeaderView.swift:18-19).
      // The bottom is 16 + 7: React Native's line box leaves less room under
      // Cardo's last line than SwiftUI's, and the date line measured 7 pt
      // high at 16.
      paddingTop: 36,
      paddingBottom: 23,
    },
    dateLine: {
      // Calling Code Regular 18, secondary (DateHeaderView.swift:25-26).
      // Calling Code isn't bundled; IBM Plex Mono stands in, at the size
      // that gives the same line width (Plex is 8% wider per glyph).
      fontFamily: 'IBMPlexMono-Regular',
      fontSize: 16.5,
      lineHeight: 22,
      // `.font(.subheadline)` symbol with `.padding(.horizontal, 4)`, then
      // the HStack's default 8 pt spacing (DateHeaderView.swift:22-24,69-70).
      iconSize: 15,
      iconPaddingHorizontal: 4,
      iconGap: 8,
      // `.padding(.bottom)` (DateHeaderView.swift:27)
      paddingBottom: 16,
    },
    list: {
      // iOS 26 inset-grouped List: the card starts 61 pt under the date
      // line's glyphs (measured), 16 pt in, radius as Settings' cards.
      topGap: 45,
      sectionInset: 16,
      cardRadius: 26,
      // A row is 72.7 pt tall (measured): `VStack(spacing: 6)` of the
      // title and the date (HomeScreenView.swift:68-75) in the row insets.
      rowPaddingHorizontal: 16,
      rowPaddingVertical: 13,
      titleDateGap: 6,
      // Calling Code 18, one line (HomeScreenView.swift:70-72); IBM Plex
      // Mono stands in at the width-matched size.
      titleFontFamily: 'IBMPlexMono-Regular',
      titleFontSize: 17,
      titleLineHeight: 24,
      // `.font(.caption)`, `.secondary` (HomeScreenView.swift:73-74)
      dateFontSize: 12,
      dateLineHeight: 16,
      // NavigationLink chevron: 17 pt from the card's edge (measured).
      chevronSize: 15,
      chevronColor: 'rgba(235, 235, 245, 0.3)',
      // Separators are inset 16 pt on both sides (measured).
      separatorInset: 16,
      separatorColor: '#38383A',
      // A pressed row's highlight (systemGray4, dark).
      pressedBackground: '#3A3A3C',
      // A clear 40 pt section under the rows (HomeScreenView.swift:100-104).
      footerHeight: 40,
    },
    swipe: {
      // `.tint(.orange)` "Edit Name" (HomeScreenView.swift:77-85) and the
      // system's red Delete (`.onDelete`), as iOS 26 draws them: a rounded
      // button beside the row (measured from `04-home-swipe-edit.png`).
      renameTint: '#FF9F0A',
      deleteTint: '#FF453A',
      // The button is 86 × 64 pt, 10 pt in from the card's edge, with
      // 11 pt to the row it uncovers; the row then rounds its own corners.
      actionWidth: 86,
      actionRadius: 14,
      actionEdgeInset: 10,
      actionRowGap: 11,
      actionVerticalInset: 4,
      actionTextSize: 13,
      openRowRadius: 18,
    },
    header: {
      // `ellipsis.circle` and `figure.wave.circle.fill` (.title, bold)
      // (HomeScreenView.swift:124-163), in iOS 26's glass toolbar circles.
      menuIconSize: 26,
      settingsCircleSize: 28,
      settingsIconSize: 20,
    },
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
    // Title glyphs start 127 pt from the screen top (measured). This is the
    // gap below Aspen Grove's native stack header that lands them there.
    largeTitleTopGap: 4,
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
  // ---------------------------------------------------------------------
  // Onboarding (LoomOnboarding.swift, LoomTreeOnboarding.swift and
  // LatentSpacesTitleView.swift, in `loom-swift/Loom/presentation/`).
  // "Measured" values are read off `50-onboarding-1.png` … `56-onboarding-
  // tree.png` (iPhone 17 Pro, iOS 26).
  // ---------------------------------------------------------------------
  onboarding: {
    // The sheet: systemBackground, elevated, dark (measured #1C1C1E).
    background: '#1C1C1E',
    // The sheet's children stack with SwiftUI's default spacing.
    stackSpacing: 8,
    wordmark: {
      // Cardo 40, one Text per letter (LatentSpacesTitleView.swift:15-27).
      fontSize: 40,
      lineHeight: 54,
      // Latent Spaces spaces LATENT 16 and SPACES 20, so both lines are
      // 249 pt wide. ASPEN and GROVE get the gaps that give the same width.
      firstLineGap: 29.5,
      secondLineGap: 25,
      // `VStack(spacing: -6)` in `.padding()`.
      lineSpacing: -6,
      padding: 16,
    },
    // `.frame(maxHeight: 400)` on the TabView (LoomOnboarding.swift:105).
    pagerHeight: 400,
    // The setup page scrolls under soft edges (#1C1C1E to clear).
    setupFade: {
      top: 16,
      bottom: 40,
    },
    page: {
      // `.frame(width: 180).clipShape(Circle())`, `VStack(spacing: 20)`,
      // `.frame(maxWidth: 300).padding(.horizontal, 30)`.
      imageSize: 180,
      imageTextGap: 20,
      maxTextWidth: 300,
      paddingHorizontal: 30,
      // Cardo 18 (`.font(.custom("Cardo", size: 18))`). SwiftUI sets Cardo
      // about 1% narrower than React Native; 17.8 gives its line breaks.
      fontSize: 17.8,
      // Lines sit 24.5 pt apart (measured).
      lineHeight: 24.5,
      // `VStack(spacing: 30)` of items; page 6 uses 15 with 15 more under
      // each link (LoomOnboarding.swift:63-99).
      itemGap: 30,
      linkPageItemGap: 15,
      linkBottomGap: 15,
      // Page 5's docs link sits 15 pt higher: `.padding(.top, -15)`.
      docsLinkTopOffset: -15,
    },
    item: {
      // An `OnboardingItem`: the symbol in `.title` with `.padding(.trailing)`
      // in a 50 pt frame, then the HStack's default 8 pt spacing
      // (LoomOnboarding.swift:150-158). Symbols center 47 pt from the edge.
      iconColumn: 50,
      iconTrailingPadding: 16,
      textGap: 8,
    },
    // A `Label` link's leading symbol sits 12 pt before its text (measured).
    linkIconGap: 12,
    button: {
      // `.controlSize(.large)` capsule in `.padding()`: 50 pt tall, 16 pt in
      // (measured).
      height: 50,
      margin: 16,
      textSize: 17,
      // `.bordered`: tertiary fill (measured #39393D); `.borderedProminent`:
      // the accent.
      borderedFill: '#39393D',
    },
    tree: {
      // "Loom Trees": Cardo 40 with `.padding(.bottom)`; "Getting Started":
      // Calling Code 22, secondary, `VStack(spacing: 10)`
      // (LoomTreeOnboarding.swift:20-31). IBM Plex Mono stands in at the
      // width-matched size (Plex is 8% wider per glyph).
      titleSize: 40,
      titleLineHeight: 54,
      titleBottomPadding: 16,
      subtitleFontFamily: 'IBMPlexMono-Regular',
      subtitleSize: 20.2,
      subtitleLineHeight: 28,
      subtitleGap: 10,
      subtitleColor: 'rgba(235, 235, 245, 0.6)',
      // Items in `.padding(.horizontal, 30).padding(.bottom, 20)`.
      itemsBottomPadding: 20,
    },
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
  // The tree menu's sheets (ToolbarMenu.swift). "Measured" values are read
  // off `34-export-sheet.png` and `36-edit-description-sheet.png` (iPhone 17
  // Pro, iOS 26, captured at 1.144 px per pt).
  exportSheet: {
    // Circle 150 with the `tree` symbol at 65 (OpenLoomExportSheet.swift:32-41).
    circleSize: 150,
    // MaterialCommunityIcons' `tree-outline` stands in for the SF `tree` and
    // draws smaller in its box: 85 matches the symbol's 63 pt height
    // (measured).
    iconSize: 85,
    // The hero VStack's `.padding()`.
    heroPadding: 16,
    // The circle's top sits 59 pt under the toolbar (measured).
    contentTopGap: 43,
    // Cardo 26 with `.padding(.top)` and `.padding(.bottom, 4)`
    // (OpenLoomExportSheet.swift:42-46).
    titleSize: 26,
    titleLineHeight: 34,
    // Cardo's line box sits tighter than SwiftUI's, so the gaps that put
    // the title and note where Latent Spaces has them are larger (measured).
    titleTopGap: 26,
    titleBottomGap: 9,
    // Calling Code 16, secondary (OpenLoomExportSheet.swift:48-55). IBM Plex
    // Mono stands in at the size that gives the same line width; lines sit
    // 20 pt apart (measured).
    noteFontFamily: 'IBMPlexMono-Regular',
    noteSize: 14.8,
    noteLineHeight: 20,
    // The "Title" header after the hero row (measured).
    firstHeaderTopGap: 29,
    // `square.and.arrow.up` in the toolbar's glass circle.
    shareIconSize: 24,
    // The clear 40 pt row at the end of the List.
    bottomSpacer: 40,
    keyboardBottomOffset: 70,
  },
  // `FullScreenTextEditor` in a sheet (FullScreenTextEditor.swift).
  textEditorSheet: {
    // `.padding(.horizontal)` plus the TextEditor's 5 pt line fragment
    // padding, which React Native's TextInput doesn't add.
    textInset: 21,
    // The first line starts 17 pt under the toolbar (measured).
    textTopGap: 17,
  },
  // The keyboard toolbar's "Done" (`ToolbarItem(placement: .keyboard)`), a
  // glass capsule over the keyboard, measured.
  keyboardDoneBar: {
    height: 45,
    sideInset: 16,
    textInset: 18,
    bottomGap: 6,
    textSize: 17,
  },
} as const;
