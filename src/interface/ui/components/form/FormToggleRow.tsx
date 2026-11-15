import { StyleSheet, Switch, View } from 'react-native';
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
 * Native views are forced dark (`Appearance.setColorScheme('dark')` and
 * `userInterfaceStyle`), where the switch's own off track is exactly Latent
 * Spaces'. A disabled toggle that is on greys out, as SwiftUI's does.
 */
export const FormToggleRow = ({
  title,
  icon,
  value,
  onValueChange,
  disabled,
  testID,
}: FormToggleRowProps) => {
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
            true: disabled
              ? form.colors.toggleDisabledOnTrack
              : loomUiTokens.colors.accentColor,
          }}
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
