/**
 * Colours shared across the loom UI.
 * Part of `loomUiTokens` (see `../loom-ui-tokens.ts` for sources and
 * conventions).
 */
export const colorTokens = {
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
} as const;
