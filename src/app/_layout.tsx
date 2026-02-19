import { Stack } from 'expo-router';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useMemo } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useThemeColors } from '@interface/hooks/useThemeColors';

const RootLayout = () => {
  const { colors, isDark } = useThemeColors();

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.background,
        text: colors.primary,
        border: colors.line,
        primary: colors.red,
      },
    }),
    [colors.background, colors.line, colors.primary, colors.red, isDark]
  );

  return (
    <KeyboardProvider>
      <ThemeProvider value={navigationTheme}>
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
              headerShadowVisible: false,
            }}
          />
        </Stack>
      </ThemeProvider>
    </KeyboardProvider>
  );
};

export default RootLayout;
