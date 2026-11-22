import { fonts } from '@interface/ui/value-objects/fonts';
import { systemColors } from './colors';

/**
 * Home: greeting, tree list, swipe actions and header.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const homeTokens = {
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
      // Calling Code isn't bundled; JetBrains Mono stands in, at the size
      // that gives the same line width (8% wider per glyph).
      fontFamily: fonts.mono,
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
      // Calling Code 18, one line (HomeScreenView.swift:70-72); JetBrains
      // Mono stands in at the width-matched size.
      titleFontFamily: fonts.mono,
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
      pressedBackground: systemColors.gray4,
      // A clear 40 pt section under the rows (HomeScreenView.swift:100-104).
      footerHeight: 40,
    },
    swipe: {
      // `.tint(.orange)` "Edit Name" (HomeScreenView.swift:77-85) and the
      // system's red Delete (`.onDelete`), as iOS 26 draws them: a rounded
      // button beside the row (measured from `04-home-swipe-edit.png`).
      renameTint: '#FF9F0A',
      deleteTint: systemColors.red,
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
      // `figure.wave.circle.fill` (.title, bold) (HomeScreenView.swift:
      // 124-163) in iOS 26's glass toolbar circles; the menu's `···` is
      // `header.ellipsisSize`.
      settingsCircleSize: 28,
      settingsIconSize: 20,
      // The symbol's filled disc and the figure cut out of it, as the
      // toolbar draws them (HomeScreenView.swift:160, measured).
      settingsDiscFill: systemColors.white,
      settingsGlyph: systemColors.black,
    },
  },
} as const;
