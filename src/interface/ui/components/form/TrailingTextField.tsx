import { forwardRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextInput,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { AppTextInput } from '../AppTextInput';

type TrailingTextFieldProps = Omit<TextInputProps, 'style'> & {
  /** The text style (font, color), which the resting value is drawn in too. */
  readonly textStyle: StyleProp<TextStyle>;
};

/**
 * A right-aligned single-line field whose value, while it isn't focused, is
 * cut off at the end with an ellipsis, as an unfocused SwiftUI `TextField`
 * shows a long value. React Native's iOS field can't: right alignment gives
 * its text a word-wrapping paragraph style, so a long value shows only up to
 * its first break ("http://") with the rest wrapped out of sight. So at rest
 * the field's own text is clear and the value is drawn over it in one
 * truncated line; focused, the field shows and scrolls its text as usual.
 * iOS only: Android's field already shows a long value on one line, and
 * its text isn't fully hidden by a clear color, so an overlay would ghost.
 */
export const TrailingTextField = forwardRef<TextInput, TrailingTextFieldProps>(
  ({ value, textStyle, onFocus, onBlur, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    // A secure field keeps its own dots: the overlay would draw the secret.
    const showsResting =
      Platform.OS === 'ios' &&
      !focused &&
      Boolean(value) &&
      !inputProps.secureTextEntry;

    return (
      <View style={styles.box}>
        <AppTextInput
          ref={ref}
          value={value}
          {...inputProps}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            textStyle,
            styles.field,
            showsResting ? styles.clearText : null,
          ]}
        />
        {showsResting ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[textStyle, styles.field, styles.resting]}
          >
            {value}
          </Text>
        ) : null}
      </View>
    );
  }
);

TrailingTextField.displayName = 'TrailingTextField';

const styles = StyleSheet.create({
  box: {
    flex: 1,
  },
  field: {
    textAlign: 'right',
    paddingVertical: 15,
  },
  clearText: {
    color: 'transparent',
  },
  resting: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
