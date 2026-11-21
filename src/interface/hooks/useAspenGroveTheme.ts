import { blurVariants } from '../ui/value-objects/blur';
import { loomUiTokens } from '../ui/value-objects/loom-ui-tokens';
import { themeColors } from '../ui/value-objects/tokens/theme-colors';

/**
 * The app theme hook — the single access pattern for colors, tokens, and
 * blur variants. Components call this directly; do not prop-drill `colors`.
 *
 * Beta ships dark-only (explicit decision, BUILD-PLAN Milestone B): the
 * prototype was forced dark at the app level and all "dynamic" colors were
 * only ever observed in dark runtime. Native UI (menus, pickers, alerts,
 * keyboard) is forced dark too, by `userInterfaceStyle: "dark"` in app.json.
 * A light palette lives in git history;
 * reintroduce it via `useColorScheme` post-beta if wanted.
 *
 * The palette itself is a token file (`themeColors`), beside `loomUiTokens`.
 */
export const useAspenGroveTheme = () => ({
  colors: themeColors,
  tokens: loomUiTokens,
  blur: blurVariants,
});
