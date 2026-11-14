import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const { background, setupFade } = loomUiTokens.onboarding;
const clear = 'rgba(28, 28, 30, 0)';

/**
 * Soft edges over a scrolling page on the onboarding sheet: content fades
 * into the sheet under the wordmark and above the button instead of being
 * cut off.
 */
export const ScrollEdgeFades = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={[background, clear]}
      style={[styles.top, { height: setupFade.top }]}
    />
    <LinearGradient
      colors={[clear, background]}
      style={[styles.bottom, { height: setupFade.bottom }]}
    />
  </View>
);

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
