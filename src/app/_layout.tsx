import { Stack } from 'expo-router';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AppBootstrapGate, AppServicesProvider } from '@interface/composition';
import { VoiceModeProvider } from '@interface/components/voice';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

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
                  <Stack.Screen
                    name="(drawer)"
                    options={{
                      headerShown: false,
                    }}
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
