/**
 * Shared sheet chrome: sheet headers, the export and text editor sheets,
 * long-press menus and the keyboard's Done bar.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const sheetTokens = {
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
  // A long-press menu as UIKit draws it on iPhone, measured on iOS 27: what
  // a lifted preview leaves room for, so it can be kept clear of the menu.
  contextMenu: {
    // 42 pt a row, rounded up for a title that wraps to two lines.
    rowHeight: 44,
    sectionGap: 20,
    verticalPadding: 16,
    // Between the lifted preview and the menu, and the preview and the header.
    previewGap: 16,
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
