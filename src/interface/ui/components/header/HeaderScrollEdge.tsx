import { Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useAspenGroveTheme } from '@interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';

const { fadeHeight } = loomUiTokens.headerScrollEdge;

/**
 * What a transparent stack header sits on, on Android. iOS 26 gives the bar
 * its automatic scroll-edge effect, which fades scrolled content out under
 * the title; Android's transparent header has nothing, so the title would
 * sit on the content. This paints the screen's black behind the bar and
 * fades it out just below, the dark scroll edge's look: invisible at rest
 * on black, and content scrolling up fades away before it reaches the title.
 * Render it after the screen's content, so it draws over it.
 */
export const HeaderScrollEdge = () => {
  const headerHeight = useHeaderHeight();
  const { colors } = useAspenGroveTheme();

  if (Platform.OS !== 'android' || headerHeight === 0) return null;

  const height = headerHeight + fadeHeight;
  return (
    <LinearGradient
      testID="header-scroll-edge"
      pointerEvents="none"
      colors={[colors.oppositePrimary, colors.oppositePrimary, 'transparent']}
      locations={[0, headerHeight / height, 1]}
      style={[styles.edge, { height }]}
    />
  );
};

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
