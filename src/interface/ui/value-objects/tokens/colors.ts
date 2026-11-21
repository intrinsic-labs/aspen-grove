/**
 * Colours shared across the loom UI.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */

/**
 * iOS system colours in the dark scheme (the app is dark only), each
 * defined once. Purpose tokens here and in the sibling files point at
 * these rather than repeating the value.
 */
export const systemColors = {
  // `.white`, and `.primary` (label) in dark.
  white: '#FFFFFF',
  // `.black`, and `AppColors.oppositePrimary` in dark (AppColors.swift:15-17).
  black: '#000000',
  // systemRed, dark.
  red: '#FF453A',
  // systemGreen, dark.
  green: '#30D158',
  // systemGray3, dark.
  gray3: '#48484A',
  // systemGray4, dark.
  gray4: '#3A3A3C',
} as const;

export const colorTokens = {
  colors: {
    // AppColors.swift:13
    green: '#6CBA78',
    // Assets.xcassets/AccentColor: display-p3 (0.781, 0.713, 0.524)
    accentColor: '#C7B686',
    // `.primary` in dark: text and glyphs on the app's dark surfaces.
    primary: systemColors.white,
    // `AppColors.oppositePrimary` in dark (AppColors.swift:15-17).
    oppositePrimary: systemColors.black,
    // Error text and destructive actions: systemRed, dark (AG; Latent
    // Spaces shows no inline errors).
    destructive: systemColors.red,
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
} as const;
