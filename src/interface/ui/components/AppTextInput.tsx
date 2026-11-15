import { forwardRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { textInputTint } from '../value-objects/text-input-tint';

/**
 * The one TextInput every text field in the app renders through. Latent
 * Spaces tints its fields with the app accent (the gold `AccentColor` asset),
 * so the caret, selection and handles are gold rather than iOS blue, over a
 * dark keyboard. Callers may still override any of these props.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  (props, ref) => (
    <TextInput ref={ref} keyboardAppearance="dark" {...tintProps} {...props} />
  )
);

AppTextInput.displayName = 'AppTextInput';

// iOS derives the caret, handles and a translucent highlight from one tint
// (`selectionColor`); Android paints `selectionColor` as the highlight itself,
// so it gets a translucent one and its caret and handles separately.
const tintProps: Partial<TextInputProps> = Platform.select({
  android: {
    cursorColor: textInputTint.caret,
    selectionHandleColor: textInputTint.caret,
    selectionColor: textInputTint.androidHighlight,
  },
  default: { selectionColor: textInputTint.caret },
});
