import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

/**
 * Header styling shared by every drawer destination (Home, Loom Trees,
 * Search, Settings), so their headers and hamburger buttons look the same.
 */
export const useDrawerHeaderStyle = () => {
  const { colors } = useAspenGroveTheme();

  return {
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: colors.oppositePrimary,
    },
    headerTitleStyle: {
      color: colors.primary,
      fontSize: 19,
      fontWeight: '600' as const,
    },
    headerTintColor: colors.accentColor,
  };
};
