import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const button = loomUiTokens.onboarding.button;
const accent = loomUiTokens.colors.accentColor;

type OnboardingButtonProps = {
  readonly label: string;
  /** `.borderedProminent` (the last page) rather than `.bordered`. */
  readonly prominent: boolean;
  readonly busy?: boolean;
  readonly onPress: () => void;
  readonly testID: string;
};

/**
 * The large capsule under the pages (LoomOnboarding.swift:113-136): bordered
 * "Next" in the accent, then the prominent accent "Begin Weaving".
 */
export const OnboardingButton = ({
  label,
  prominent,
  busy = false,
  onPress,
  testID,
}: OnboardingButtonProps) => (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ busy }}
    disabled={busy}
    onPress={onPress}
    style={({ pressed }) => [
      styles.capsule,
      { backgroundColor: prominent ? accent : button.borderedFill },
      { opacity: pressed ? 0.7 : 1 },
    ]}
  >
    {busy ? (
      <ActivityIndicator color={prominent ? '#FFFFFF' : accent} />
    ) : (
      <Text style={[styles.label, { color: prominent ? '#FFFFFF' : accent }]}>
        {label}
      </Text>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  capsule: {
    height: button.height,
    borderRadius: button.height / 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: button.margin,
  },
  label: {
    fontSize: button.textSize,
    fontWeight: '700',
  },
});
