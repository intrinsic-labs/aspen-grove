import { Pressable, StyleSheet, Text, View } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const tokens = loomUiTokens.home.swipe;

type TreeRowActionProps = {
  readonly testID: string;
  readonly label: string;
  readonly tint: string;
  readonly edge: 'leading' | 'trailing';
  readonly onPress: () => void;
};

/**
 * One swipe action under a tree row, as iOS 26 draws a List swipe action:
 * a tinted rounded button standing apart from the row it uncovers.
 */
export const TreeRowAction = ({
  testID,
  label,
  tint,
  edge,
  onPress,
}: TreeRowActionProps) => (
  <View
    style={[
      styles.slot,
      edge === 'leading' ? styles.leadingSlot : styles.trailingSlot,
    ]}
  >
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tint, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  slot: {
    width: tokens.actionWidth + tokens.actionEdgeInset + tokens.actionRowGap,
    paddingVertical: tokens.actionVerticalInset,
  },
  leadingSlot: {
    paddingLeft: tokens.actionEdgeInset,
    paddingRight: tokens.actionRowGap,
  },
  trailingSlot: {
    paddingLeft: tokens.actionRowGap,
    paddingRight: tokens.actionEdgeInset,
  },
  button: {
    flex: 1,
    borderRadius: tokens.actionRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: tokens.actionTextSize,
    fontWeight: '500',
  },
});
