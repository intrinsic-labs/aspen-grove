import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type ProviderOptionProps = {
  readonly title: string;
  readonly detail: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID: string;
};

/** One provider choice: a radio row with a name and a short line. */
export const ProviderOption = ({
  title,
  detail,
  selected,
  onPress,
  testID,
}: ProviderOptionProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? colors.accentColor : colors.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={selected ? colors.accentColor : colors.secondary}
      />
      <View style={styles.text}>
        <AppText variant="mono" tone="primary">
          {title}
        </AppText>
        <AppText variant="meta" tone="secondary">
          {detail}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
