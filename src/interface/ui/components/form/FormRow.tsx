import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { useFormColors } from './form-context';

const form = loomUiTokens.settingsForm;

export type FormRowProps = {
  readonly children: ReactNode;
  /** A tappable row highlights while pressed, as a Form button does. */
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
  /**
   * Read by FormSection: `icon` starts the separator below this row after
   * the icon column, for a row whose content is a Label with an icon.
   */
  readonly separatorInset?: 'icon';
  /** Forwarded to the row's host view. */
  readonly testID?: string;
};

/** The base Form row: 52 pt, inset 16, content in a horizontal line. */
export const FormRow = ({
  children,
  onPress,
  disabled,
  accessibilityLabel,
  style,
  testID,
}: FormRowProps) => {
  const colors = useFormColors();

  if (!onPress) {
    return (
      <View testID={testID} style={[styles.row, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        pressed ? { backgroundColor: colors.pressed } : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: form.rowMinHeight,
    paddingHorizontal: form.rowPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
