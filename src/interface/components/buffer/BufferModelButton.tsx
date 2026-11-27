import { Pressable, StyleSheet, Text } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { fonts } from '@/interface/ui/value-objects/fonts';

type BufferModelButtonProps = {
  readonly onPress: () => void;
};

/**
 * The buffer's header action to its Model screen. It reads "Model" rather
 * than the model's name: a name beside the document's title truncated both.
 */
export const BufferModelButton = ({ onPress }: BufferModelButtonProps) => {
  const { colors } = useAspenGroveTheme();
  return (
    <Pressable
      testID="buffer-model-button"
      accessibilityRole="button"
      accessibilityLabel="Model"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: colors.primary }]}>
        Model
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 13,
  },
});
