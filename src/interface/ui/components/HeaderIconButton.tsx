import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

type IoniconsName = keyof typeof Ionicons.glyphMap;

type HeaderIconButtonProps = {
  readonly icon: IoniconsName;
  readonly accessibilityLabel: string;
  /**
   * Omit when the button is wrapped by a ContextMenu (dropdownMenuMode),
   * which handles the press itself.
   */
  readonly onPress?: () => void;
  readonly iconSize?: number;
  readonly disabled?: boolean;
};

/**
 * Circular icon button used in screen headers. Keep this aligned with the
 * native-looking controls on the individual loom tree screen.
 */
export const HeaderIconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  iconSize = 22,
  disabled,
}: HeaderIconButtonProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 },
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={colors.primary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
