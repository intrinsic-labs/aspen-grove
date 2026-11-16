import { forwardRef } from 'react';
import { StyleSheet, type TextInput, type TextInputProps } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel } from './FormLabel';
import { FormRow } from './FormRow';
import { formText } from './form-text';
import { AppTextInput } from '../AppTextInput';
import { TrailingTextField } from './TrailingTextField';

const form = loomUiTokens.settingsForm;

type FormTextFieldRowProps = Omit<TextInputProps, 'style'> & {
  /**
   * With a title, the field is trailing and right-aligned in secondary text
   * and takes the row after the title (the Username row,
   * LoomSettingsView.swift:214-220); a long value is cut off with an
   * ellipsis while the field isn't focused. Without one it fills
   * the row (the key field, APIKeySettingsView.swift:110).
   */
  readonly title?: string;
  /** A multiline field grows; give it a minimum height. */
  readonly minHeight?: number;
};

/** A `TextField` / `SecureField` in a Form row. */
export const FormTextFieldRow = forwardRef<TextInput, FormTextFieldRowProps>(
  ({ title, minHeight, multiline, ...inputProps }, ref) => (
    <FormRow style={multiline ? styles.multilineRow : null}>
      {title ? <FormLabel title={title} hug /> : null}
      {title && !multiline ? (
        <TrailingTextField
          ref={ref}
          placeholderTextColor={form.colors.tertiaryLabel}
          {...inputProps}
          textStyle={formText.value}
        />
      ) : (
        <AppTextInput
          ref={ref}
          placeholderTextColor={form.colors.tertiaryLabel}
          multiline={multiline}
          {...inputProps}
          style={[
            title ? formText.value : formText.body,
            title ? styles.trailingField : styles.fullField,
            multiline ? [styles.multiline, { minHeight }] : null,
          ]}
        />
      )}
    </FormRow>
  )
);

FormTextFieldRow.displayName = 'FormTextFieldRow';

const styles = StyleSheet.create({
  trailingField: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 15,
  },
  fullField: {
    flex: 1,
    paddingVertical: 15,
  },
  multilineRow: {
    alignItems: 'flex-start',
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: 15,
    paddingBottom: 15,
  },
});
