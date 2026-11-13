import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ScrollBottomFadeProps = {
  /** The page colour, as `#RRGGBB`. */
  readonly color: string;
  readonly height: number;
};

/**
 * A soft bottom edge over a scrolling page, so content fades into what's
 * pinned under it instead of being cut off mid-line. Place it inside the
 * scroll view's container.
 */
export const ScrollBottomFade = ({ color, height }: ScrollBottomFadeProps) => (
  <LinearGradient
    pointerEvents="none"
    // The same colour fully clear, so the fade doesn't pass through black.
    colors={[`${color}00`, color]}
    style={[styles.fade, { height }]}
  />
);

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
