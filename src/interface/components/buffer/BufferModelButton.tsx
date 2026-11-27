import { Pressable, StyleSheet, Text } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { fonts } from '@/interface/ui/value-objects/fonts';

type BufferModelButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
};

/** A native-header text action sized like the dialogue header's controls. */
export const BufferModelButton = ({
  label,
  onPress,
}: BufferModelButtonProps) => {
  const { colors } = useAspenGroveTheme();
  return (
    <Pressable
      testID="buffer-model-button"
      accessibilityRole="button"
      accessibilityLabel={`Model, ${label}`}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    maxWidth: 180,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 13,
  },
});
