import { colorTokens, systemColors } from './colors';

/**
 * The buffer editor: a quiet document, not a chat. Part of `loomUiTokens`
 * (as `buffer`; see `../loom-ui-tokens.ts` for conventions). Aspen Grove's
 * own, with no Latent Spaces source; every look decision for the writing
 * surface lives here and in the two small control components.
 */
export const bufferTokens = {
  colors: {
    // The human's text, as every other screen draws it (`themeColors.textColor`).
    humanText: 'rgba(255, 255, 255, 0.9)',
    // Model-authored text: a soft blue, about 11.5:1 against black (WCAG).
    modelText: '#9EC3EE',
    placeholder: 'rgba(235, 235, 245, 0.3)',
    background: systemColors.black,
  },
  layout: {
    // Generous margins and leading: reading, not messaging.
    horizontalMargin: 24,
    // Space between the header and the first line.
    topGap: 16,
    // Line pitch over the font size; the dialogue's is 1.352.
    lineHeightRatio: 1.6,
    // Room under the last line (the pill's band sits below the document).
    documentBottomPadding: 24,
  },
  // The floating branch pill (mockup 03-branches-pill).
  control: {
    height: 36,
    // Half the height: a full pill.
    radius: 18,
    paddingHorizontal: 4,
    gap: 4,
    // systemGray5 at 0.92.
    fill: 'rgba(44, 44, 46, 0.92)',
    shadowColor: systemColors.black,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffsetY: 4,
    // Android's elevation shadow, the nearest to the soft one above.
    elevation: 8,
    stepSize: 30,
    iconSize: 17,
    iconColor: colorTokens.colors.accentColor,
    iconColorDisabled: 'rgba(235, 235, 245, 0.25)',
    labelSize: 12.5,
    labelColor: 'rgba(235, 235, 245, 0.85)',
    labelPaddingHorizontal: 6,
    hitSlop: 8,
    // Horizontal travel that counts as a swipe.
    swipeDistance: 32,
  },
  dots: {
    // At most this many, so many siblings never overflow the pill.
    max: 7,
    size: 5,
    gap: 4,
    // Space between the label and the dots.
    marginLeft: 6,
    color: 'rgba(235, 235, 245, 0.3)',
    activeColor: colorTokens.colors.green,
  },
  // Where the pill floats: gaps around it, in the band it owns.
  bar: {
    topGap: 8,
    bottomGap: 12,
  },
} as const;
