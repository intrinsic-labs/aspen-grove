import { systemColors } from './colors';

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
    // Model-authored text: a muted blue, 8.5:1 against black (WCAG).
    modelText: '#7FA6E6',
    placeholder: 'rgba(235, 235, 245, 0.3)',
    // Hairline above the control bar.
    controlDivider: 'rgba(255, 255, 255, 0.12)',
    background: systemColors.black,
  },
  layout: {
    // Generous margins and leading: reading, not messaging.
    horizontalMargin: 24,
    // Space between the header and the first line.
    topGap: 16,
    // Line pitch over the font size; the dialogue's is 1.352.
    lineHeightRatio: 1.6,
    // Room under the last line so it can scroll clear of the bar.
    documentBottomPadding: 24,
  },
  control: {
    height: 44,
    stepSize: 36,
    iconSize: 18,
    iconColor: 'rgba(235, 235, 245, 0.6)',
    labelSize: 13,
    labelMinWidth: 128,
    gap: 4,
    hitSlop: 8,
    // Horizontal travel that counts as a swipe.
    swipeDistance: 32,
  },
} as const;
