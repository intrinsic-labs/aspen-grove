import { Stack } from 'expo-router';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { settingsScreenOptions } from '../settings-screen-options';
import { connectionProviderTitle } from './connection-provider';

/**
 * The Connections sheet: a stack of its own, so a provider's screen pushes
 * inside the sheet, over the screen the user came from. The list keeps the
 * sheet's glass Done bar; the provider's screen gets the system bar and
 * back button, as in Settings.
 */
export const ConnectionsSheetStack = () => (
  <Stack>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen
      name="[provider]"
      options={({ route }) =>
        settingsScreenOptions(
          loomUiTokens.colors.primary,
          connectionProviderTitle(
            (route.params as { provider?: string } | undefined)?.provider
          )
        )
      }
    />
  </Stack>
);
