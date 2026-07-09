import { Stack } from 'expo-router';
import { DrawerMenuButton } from '@interface/components/drawer/DrawerMenuButton';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

/**
 * Settings is a nested stack inside the drawer: the index screen lists
 * sections, each section pushes its own screen (native back to pop).
 */
const SettingsStackLayout = () => {
  const { colors } = useAspenGroveTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.oppositePrimary,
        },
        headerTitleStyle: {
          color: colors.primary,
          fontSize: 19,
          fontWeight: '600',
        },
        headerTintColor: colors.accentColor,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: {
          backgroundColor: colors.oppositePrimary,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
      <Stack.Screen name="agents" options={{ title: 'Agents' }} />
      <Stack.Screen name="connections" options={{ title: 'Connections' }} />
      <Stack.Screen name="typography" options={{ title: 'Typography' }} />
      <Stack.Screen name="behavior" options={{ title: 'Behavior' }} />
    </Stack>
  );
};

export default SettingsStackLayout;
