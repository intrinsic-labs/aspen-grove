import { fonts } from '@interface/ui/value-objects/fonts';
/**
 * Aspen Grove's OpenRouter model browser.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const modelBrowserTokens = {
  // Aspen Grove's OpenRouter model browser (no Latent Spaces equivalent):
  // the list's rows and a model's page, in the settings Form's language,
  // with Cardo for the model's name on its page and mono for figures.
  modelBrowser: {
    metaFontFamily: fonts.mono,
    // Row: name 17 (Form body), author 13 (footnote), figures mono 12.
    authorSize: 13,
    authorLineHeight: 17,
    metaSize: 12,
    metaLineHeight: 16,
    rowVerticalPadding: 11,
    rowLineGap: 2,
    // Page: the name in Cardo 30, as the app's sheet heroes (Cardo 28-32).
    titleFontFamily: 'Cardo-Regular',
    titleSize: 30,
    titleLineHeight: 36,
    heroTopGap: 12,
    heroLineGap: 4,
    // Description in the card: 15 pt, the subheadline size.
    descriptionSize: 15,
    descriptionLineHeight: 21,
    descriptionPadding: 14,
    // Values in the rows: mono 15.
    valueSize: 15,
    // Supported parameters as mono chips.
    chipSize: 12,
    chipPaddingHorizontal: 8,
    chipPaddingVertical: 4,
    chipRadius: 8,
    chipGap: 6,
    chipBackground: 'rgba(120, 120, 128, 0.24)',
    // The "Use This Model" capsule pinned above the home indicator.
    useButtonBottomGap: 8,
    // The page fades into the pinned button instead of being cut off.
    useButtonFadeHeight: 32,
  },
} as const;
