import { useColorScheme } from 'react-native';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      white: '#fff',
      black: '#000',
      background: isDark ? '#000' : '#fff',

      surface: isDark ? '#1e1e1e' : '#e6e6e6',
      onSurface: isDark ? '#fff' : '#000',
      inverseSurface: isDark ? '#e6e6e6' : '#1e1e1e',
      onInverseSurface: isDark ? '#000' : '#fff',

      primary: isDark ? '#fff' : '#000',
      secondary: isDark ? '#9a9a9a' : '#5f5f5f',
      tertiary: isDark ? '#5d5d5d' : '#b7b7b7',

      red: '#c83f3f',
      blue: '#4382ab',
    },
  };
};
