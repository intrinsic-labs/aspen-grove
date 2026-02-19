import { useColorScheme } from 'react-native';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const light = {
    background: '#E7E2D7',
    backgroundMuted: '#D9D3C6',
    surface: '#161A22',
    surfaceSoft: '#202632',
    onSurface: '#F6F2E9',
    primary: '#101217',
    secondary: '#4C4B44',
    tertiary: '#8D8A7E',
    line: '#2A2A2A',
    red: '#E75C55',
    blue: '#5A789E',
  } as const;

  const dark = {
    background: '#101217',
    backgroundMuted: '#171A22',
    surface: '#ECE5D5',
    surfaceSoft: '#D7CDB8',
    onSurface: '#101217',
    primary: '#F3EEDF',
    secondary: '#B6B09E',
    tertiary: '#787567',
    line: '#3A3F4D',
    red: '#EF6F66',
    blue: '#85A8D4',
  } as const;

  const palette = isDark ? dark : light;

  return {
    isDark,
    colors: {
      white: '#fff',
      black: '#000',
      background: palette.background,
      backgroundMuted: palette.backgroundMuted,

      surface: palette.surface,
      surfaceSoft: palette.surfaceSoft,
      onSurface: palette.onSurface,
      inverseSurface: isDark ? '#E6DFC9' : '#171A22',
      onInverseSurface: isDark ? '#101217' : '#F4EFE4',

      primary: palette.primary,
      secondary: palette.secondary,
      tertiary: palette.tertiary,
      line: palette.line,

      red: palette.red,
      blue: palette.blue,
    },
  };
};
