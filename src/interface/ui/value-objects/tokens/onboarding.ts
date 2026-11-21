import { systemColors } from './colors';

/**
 * Onboarding: the intro sheet, setup page and a first tree's Getting
 * Started sheet.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const onboardingTokens = {
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
      // The sheet's #1C1C1E at zero alpha: the fades run to clear in the
      // sheet's own colour, not to transparent black.
      clear: 'rgba(28, 28, 30, 0)',
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
      // `.borderedProminent`'s label on the accent (LoomOnboarding.swift:136,
      // LoomTreeOnboarding.swift:55), white.
      prominentLabel: systemColors.white,
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
} as const;
