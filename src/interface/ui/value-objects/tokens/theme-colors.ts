import { colorTokens, systemColors } from './colors';

const { colors } = colorTokens;

/**
 * The palette `useAspenGroveTheme()` hands out as `colors`, dark only (the
 * light one lives in git history). Older screens read it; ported screens
 * use `loomUiTokens` directly. Values are Aspen Grove's unless noted.
 */
export const themeColors = {
  // Universal accents
  green: colors.green,
  accentColor: colors.accentColor,
  lightOrange: '#beae7f',

  // Dark palette
  // `.primary` / `AppColors.oppositePrimary` in dark (AppColors.swift:15-17).
  primary: systemColors.white,
  textColor: 'rgba(255, 255, 255, 0.9)',
  systemMessage: 'rgba(255, 255, 255, 0.6)',
  oppositePrimary: systemColors.black,
  continuationCardText: 'rgba(0, 0, 0, 0.8)',
  secondary: '#999999',
  secondaryVariant: 'rgba(153, 153, 153, 0.8)',
  // AG's code fill; Latent Spaces fills code with `.secondary.opacity(0.08)`
  // (CodeBlockView.swift:104).
  codeBackground: 'rgba(153, 153, 155, 0.08)',
  line: 'rgba(255, 255, 255, 0.2)',
  surface: 'rgba(255, 255, 255, 0.15)',
  backgroundMuted: 'rgba(255, 255, 255, 0.05)',
  tertiary: 'rgba(255, 255, 255, 0.4)',
  // systemRed, light (not `colors.destructive`, which is the dark one).
  red: '#FF3B30',
  onSurface: 'rgba(255, 255, 255, 0.9)',
} as const;
