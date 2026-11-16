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
import { useFormColors } from './form-context';

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
 * Android's field keeps a long value on one line but clips it wherever it
 * last scrolled, with no ellipsis, so it rests the same way. Each platform
 * hides the field its own way: on iOS a clear text color does it. Android
 * still draws some of the text in a clear color (it ghosted under the
 * overlay), and at opacity 0 it drops the field from the accessibility
 * tree, so TalkBack (and Maestro) can't reach it; there the field stays as
 * it is and the overlay covers it on the card's color.
 */
export const TrailingTextField = forwardRef<TextInput, TrailingTextFieldProps>(
  ({ value, textStyle, onFocus, onBlur, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const { card } = useFormColors();
    // A secure field keeps its own dots: the overlay would draw the secret.
    const showsResting =
      !focused && Boolean(value) && !inputProps.secureTextEntry;

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
            showsResting && Platform.OS === 'ios' ? styles.clearText : null,
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
            style={[
              textStyle,
              styles.field,
              styles.resting,
              Platform.OS === 'android' ? { backgroundColor: card } : null,
            ]}
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
