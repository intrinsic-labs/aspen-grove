import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const background = loomUiTokens.settingsForm.colors.background;

/**
 * Stack options for the Settings screens, which Home pushes as Latent
 * Spaces does (HomeScreenView.swift `openSettings`): a black bar with the
 * system back button. Settings itself draws its large title in the Form and
 * shows it inline only once it scrolls under the bar; Agents and
 * Connections have an inline title.
 */
export const settingsScreenOptions = (
  primary: string,
  title: string,
  largeTitle = false
) => ({
  title,
  ...(largeTitle ? { headerTitle: '' } : {}),
  headerShadowVisible: false,
  headerStyle: { backgroundColor: background },
  // The system inline title: 17 pt semibold.
  headerTitleStyle: { color: primary },
  headerTintColor: primary,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: background },
});
