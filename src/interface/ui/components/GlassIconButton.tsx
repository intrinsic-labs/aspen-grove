import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';

type IoniconsName = keyof typeof Ionicons.glyphMap;

type GlassIconButtonProps = {
  readonly icon: IoniconsName;
  readonly iconSize: number;
  readonly size: number;
  readonly accessibilityLabel: string;
  /** Omit inside a ContextMenu (dropdownMenuMode), which takes the press. */
  readonly onPress?: () => void;
  readonly testID?: string;
};

/**
 * A round glass toolbar button, as iOS 26 draws a sheet's toolbar icons
 * (`chevron.left`, `ellipsis.circle`).
 */
export const GlassIconButton = ({
  icon,
  iconSize,
  size,
  accessibilityLabel,
  onPress,
  testID,
}: GlassIconButtonProps) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={6}
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
  >
    <GlassView
      glassEffectStyle="regular"
      colorScheme="dark"
      isInteractive
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
    </GlassView>
  </Pressable>
);

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
