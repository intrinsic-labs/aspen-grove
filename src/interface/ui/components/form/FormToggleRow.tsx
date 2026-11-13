import { StyleSheet, Switch, useColorScheme, View } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel, type FormIconName } from './FormLabel';
import { FormRow } from './FormRow';

const form = loomUiTokens.settingsForm;

type FormToggleRowProps = {
  readonly title: string;
  readonly icon?: FormIconName;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly disabled?: boolean;
  /** Forwarded to the host Switch. */
  readonly testID?: string;
};

/**
 * A Form `Toggle` tinted with the accent (LoomSettingsView.swift:277-278).
 * Aspen Grove's native views follow the system appearance (Latent Spaces
 * forces dark). Under a dark system the switch's own off track is exactly
 * Latent Spaces'; under a light one it would be near-white on the dark
 * row, so the off track is filled instead (`ios_backgroundColor`, which
 * `trackColor.false` alone only outlines on iOS).
 */
export const FormToggleRow = ({
  title,
  icon,
  value,
  onValueChange,
  disabled,
  testID,
}: FormToggleRowProps) => {
  const offTrack =
    useColorScheme() === 'dark' ? undefined : form.colors.toggleOffTrack;
  return (
    <FormRow>
      <FormLabel title={title} icon={icon} />
      {/* iOS 26's switch is 63 × 28 and draws from the top of whatever frame
        it gets; a frame of exactly that size keeps it centered in the row. */}
      <View style={styles.switchFrame}>
        <Switch
          testID={testID}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: offTrack,
            true: loomUiTokens.colors.accentColor,
          }}
          ios_backgroundColor={offTrack}
        />
      </View>
    </FormRow>
  );
};

const styles = StyleSheet.create({
  switchFrame: {
    height: 28,
    justifyContent: 'center',
    marginRight: -form.toggleTrailingOutset,
  },
});
