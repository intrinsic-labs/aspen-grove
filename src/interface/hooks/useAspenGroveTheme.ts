import { useColorScheme } from 'react-native';
import { blurVariants } from '../ui/value-objects/blur';

export const useAspenGroveTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const colors = {
    universal: {
      green: '#6CBA78',
      accentColor: '#C7B686',
      lightOrange: '#beae7f'
    },
  
    dark: {
      primary: '#fff',
      textColor: 'rgba(255, 255, 255, 0.9)',
      systemMessage: 'rgba(255, 255, 255, 0.6)',
      oppositePrimary: '#000',
      continuationCardText: 'rgba(0, 0, 0, 0.8)',
      secondary: '#999999',
      secondaryVariant: 'rgba(153, 153, 153, 0.8)',
      codeBackground: 'rgba(153, 153, 155, 0.08)',
    },
    
    light: {
      primary: '#000',
      textColor: 'rgba(0, 0, 0, 0.9)',
      systemMessage: 'rgba(0, 0, 0, 0.6)',
      oppositePrimary: '#fff',
      continuationCardText: 'rgba(255, 255, 255, 0.8)',
      secondary: '#8b8b8b',
      secondaryVariant: 'rgba(139, 139, 139, 0.8)',
      codeBackground: 'rgba(139, 139, 139, 0.08)',
    }
  };

  const palette = isDark ? colors.dark : colors.light;
  
  const styles = {
    nodeTextPadding: 8,
    
    continuationRail: {
      descriptiveTextSize: 14,
      cardCornerRaduis: 4,
      cardWidth: 275,
      elementSpacing: 22,
      bottomPadding: 18,
      dividerBottomPadding: 22
    },
    
    composer: {
      borderRadius: 26,
      padding: 8,
      shadowRadius: 15,
      borderWidth: 0.5,
      buttonSize: 28,
    }
    
  }

  return {
    isDark,
    colors: {
      ...colors.universal,
      ...palette
    },
    styles,
    blur: blurVariants,
  };
};
