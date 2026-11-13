import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
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

/**
 * `HStack { Text(title); Spacer(); Text(value) }` in a Form row. The testID
 * lands on the value's Text, so a driver can read the value by it.
 */
export const FormValueRow = ({ title, value, testID }: FormValueRowProps) => (
  <FormRow>
    <FormLabel title={title} />
    <Text testID={testID} style={formText.body}>
      {value}
    </Text>
  </FormRow>
);

type FormSliderRowProps = {
  readonly value: number;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly step: number;
  readonly onValueChange: (value: number) => void;
  /** When the thumb is let go: the place to save. */
  readonly onSlidingComplete?: (value: number) => void;
  readonly disabled?: boolean;
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
  onSlidingComplete,
  disabled,
  testID,
}: FormSliderRowProps) => {
  // The native slider (iOS, v5) applies `value` before `maximumValue`, so a
  // value past its default range of 0...1 is clamped as it mounts. Mount at
  // the minimum and hand it the value once the range is set.
  const [ranged, setRanged] = useState(false);
  useEffect(() => setRanged(true), []);
  return (
    <FormRow style={styles.sliderRow}>
      <Slider
        testID={testID}
        value={ranged ? value : minimumValue}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
        disabled={disabled}
        minimumTrackTintColor={loomUiTokens.colors.accentColor}
        style={styles.slider}
      />
    </FormRow>
  );
};

const styles = StyleSheet.create({
  sliderRow: {
    minHeight: 61,
  },
  slider: {
    flex: 1,
    height: 40,
  },
});
