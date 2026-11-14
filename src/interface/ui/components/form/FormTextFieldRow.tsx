import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel } from './FormLabel';
import { FormRow } from './FormRow';
import { formText } from './form-text';

const form = loomUiTokens.settingsForm;

type FormTextFieldRowProps = Omit<TextInputProps, 'style'> & {
  /**
   * With a title, the field is trailing and right-aligned in secondary text
   * (the Username row, LoomSettingsView.swift:214-220). Without one it fills
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
      {title ? <FormLabel title={title} /> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={form.colors.tertiaryLabel}
        selectionColor={loomUiTokens.colors.accentColor}
        keyboardAppearance="dark"
        multiline={multiline}
        {...inputProps}
        style={[
          title ? formText.value : formText.body,
          title ? styles.trailingField : styles.fullField,
          multiline ? [styles.multiline, { minHeight }] : null,
        ]}
      />
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
