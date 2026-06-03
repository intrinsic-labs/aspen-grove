import { Stack } from 'expo-router';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useMemo } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  AppBootstrapGate,
  AppServicesProvider,
} from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { MaterialView } from '@/interface/ui/components/MaterialView';

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
    <KeyboardProvider>
      <ThemeProvider value={navigationTheme}>
        <AppServicesProvider>
          <AppBootstrapGate>
            <Stack>
              <Stack.Screen
                name="(tabs)"
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
                }}
              />
            </Stack>
          </AppBootstrapGate>
        </AppServicesProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
};

export default RootLayout;
