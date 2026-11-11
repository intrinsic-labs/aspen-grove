import { Stack } from 'expo-router';
import { DrawerScreenHeader } from '@interface/components/drawer/DrawerScreenHeader';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

/**
 * Settings is a nested stack inside the drawer: the index screen is Latent
 * Spaces' one settings Form; Agents and Connections push their own screens
 * (native back to pop).
 */
const SettingsStackLayout = () => {
  const { colors } = useAspenGroveTheme();
  const background = loomUiTokens.settingsForm.colors.background;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: background },
        // The system inline title: 17 pt semibold.
        headerTitleStyle: { color: colors.primary },
        headerTintColor: colors.primary,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          // Shown inline only once the large title scrolls under the bar.
          headerTitle: '',
          // The drawer's JS header, not the native one: see DrawerScreenHeader.
          header: ({ options }) => (
            <DrawerScreenHeader
              title={
                typeof options.headerTitle === 'string'
                  ? options.headerTitle
                  : ''
              }
            />
          ),
        }}
      />
      <Stack.Screen name="agents" options={{ title: 'Agents' }} />
      <Stack.Screen name="connections" options={{ title: 'Connections' }} />
    </Stack>
  );
};

export default SettingsStackLayout;
