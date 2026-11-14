import Slider from '@react-native-community/slider';
import { StyleSheet, Text } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel } from './FormLabel';
import { FormRow } from './FormRow';
import { formText } from './form-text';

type FormValueRowProps = {
  readonly title: string;
  readonly value: string;
  readonly testID?: string;
};

/** `HStack { Text(title); Spacer(); Text(value) }` in a Form row. */
export const FormValueRow = ({ title, value, testID }: FormValueRowProps) => (
  <FormRow testID={testID}>
    <FormLabel title={title} />
    <Text style={formText.body}>{value}</Text>
  </FormRow>
);

type FormSliderRowProps = {
  readonly value: number;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly step: number;
  readonly onValueChange: (value: number) => void;
  /** Forwarded to the host Slider. */
  readonly testID?: string;
};

/**
 * A Form `Slider` row; the value sits in the row above (FormValueRow), as
 * Latent Spaces lays out Temperature and Maximum Output Tokens
 * (LoomSettingsView.swift:183-200). The track left of the thumb is gold.
 */
export const FormSliderRow = ({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  testID,
}: FormSliderRowProps) => (
  <FormRow style={styles.sliderRow}>
    <Slider
      testID={testID}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      onValueChange={onValueChange}
      minimumTrackTintColor={loomUiTokens.colors.accentColor}
      style={styles.slider}
    />
  </FormRow>
);

const styles = StyleSheet.create({
  sliderRow: {
    minHeight: 61,
  },
  slider: {
    flex: 1,
    height: 40,
  },
});
