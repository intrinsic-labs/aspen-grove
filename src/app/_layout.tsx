import { Stack } from 'expo-router';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useMemo } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AppBootstrapGate, AppServicesProvider } from '@interface/composition';
import { settingsScreenOptions } from '@interface/components/settings/settings-screen-options';
import { VoiceModeProvider } from '@interface/components/voice';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

// The app is dark only (useAspenGroveTheme), as Latent Spaces is with
// `.preferredColorScheme(.dark)`. Force native chrome dark too, so menus,
// alerts and the keyboard don't follow a light system appearance. The launch
// splash runs before this and still follows the system.
Appearance.setColorScheme('dark');

const RootLayout = () => {
  const { colors, isDark } = useAspenGroveTheme();

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.oppositePrimary,
        card: 'transparent',
        text: colors.primary,
        border: colors.oppositePrimary,
        primary: colors.accentColor,
      },
    }),
    [colors.primary, colors.oppositePrimary, colors.accentColor, isDark]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <ThemeProvider value={navigationTheme}>
          <AppServicesProvider>
            <AppBootstrapGate>
              <VoiceModeProvider>
                <Stack>
                  {/* Home: a bare transparent bar holding the `···` menu and
                      the Settings button (HomeScreenView.swift:122-164). */}
                  <Stack.Screen
                    name="index"
                    options={{
                      title: '',
                      headerTransparent: true,
                      headerShadowVisible: false,
                    }}
                  />
                  <Stack.Screen
                    name="search"
                    options={{
                      title: 'Search',
                      headerShadowVisible: false,
                      headerTintColor: colors.primary,
                      headerStyle: { backgroundColor: colors.oppositePrimary },
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="settings/index"
                    options={settingsScreenOptions(
                      colors.primary,
                      'Settings',
                      true
                    )}
                  />
                  <Stack.Screen
                    name="settings/agents"
                    options={settingsScreenOptions(colors.primary, 'Agents')}
                  />
                  <Stack.Screen
                    name="settings/connections"
                    options={settingsScreenOptions(
                      colors.primary,
                      'Connections'
                    )}
                  />
                  <Stack.Screen
                    name="tree/[treeId]"
                    options={{
                      title: 'Dialogue',
                      headerTransparent: true,
                      headerShadowVisible: false,
                      headerBackTitle: '',
                      // headerBackVisible: false,
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="tree/[treeId]/node/[nodeId]"
                    options={{
                      title: 'Node',
                      headerTransparent: true,
                      headerShadowVisible: false,
                      headerBackTitle: '',
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="tree/[treeId]/compose"
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="onboarding"
                    options={{
                      headerShown: false,
                      animation: 'fade',
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen
                    name="connections"
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                </Stack>
              </VoiceModeProvider>
            </AppBootstrapGate>
          </AppServicesProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
