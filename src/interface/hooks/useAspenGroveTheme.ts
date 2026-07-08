import { blurVariants } from '../ui/value-objects/blur';
import { loomUiTokens } from '../ui/value-objects/loom-ui-tokens';

/**
 * The app theme hook — the single access pattern for colors, tokens, and
 * blur variants. Components call this directly; do not prop-drill `colors`.
 *
 * Beta ships dark-only (explicit decision, BUILD-PLAN Milestone B): the
 * prototype was forced dark at the app level and all "dynamic" colors were
 * only ever observed in dark runtime. A light palette lives in git history;
 * reintroduce it via `useColorScheme` post-beta if wanted.
 */
export const useAspenGroveTheme = () => {
  const isDark = true as const;

  const colors = {
    // Universal accents
    green: '#6CBA78',
    accentColor: '#C7B686',
    lightOrange: '#beae7f',

    // Dark palette
    primary: '#fff',
    textColor: 'rgba(255, 255, 255, 0.9)',
    systemMessage: 'rgba(255, 255, 255, 0.6)',
    oppositePrimary: '#000',
    continuationCardText: 'rgba(0, 0, 0, 0.8)',
    secondary: '#999999',
    secondaryVariant: 'rgba(153, 153, 153, 0.8)',
    codeBackground: 'rgba(153, 153, 155, 0.08)',
    line: 'rgba(255, 255, 255, 0.2)',
    surface: 'rgba(255, 255, 255, 0.15)',
    backgroundMuted: 'rgba(255, 255, 255, 0.05)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
    red: '#FF3B30',
    onSurface: 'rgba(255, 255, 255, 0.9)',
  };

  return {
    isDark,
    colors,
    tokens: loomUiTokens,
    blur: blurVariants,
  };
};
