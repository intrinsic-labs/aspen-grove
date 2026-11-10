import { Switch } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

/** Off track: visible against black, clearly dimmer than the on state. */
const OFF_TRACK = 'rgba(255, 255, 255, 0.22)';
const THUMB = '#FFFFFF';

type AppSwitchProps = {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  /** On-track color. Defaults to the gold system tint. */
  readonly onColor?: string;
  readonly disabled?: boolean;
  /** Forwarded to the host Switch. */
  readonly testID?: string;
};

/**
 * The app's toggle. On is the gold system tint with a white thumb; off is a
 * dim track. iOS 26 draws a white track behind a white thumb when the on
 * color is white, so the tint must never be `colors.primary`.
 * `ios_backgroundColor` fills the off track on iOS, where `trackColor.false`
 * alone only tints its edge.
 */
export const AppSwitch = ({
  value,
  onValueChange,
  onColor,
  disabled,
  testID,
}: AppSwitchProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <Switch
      testID={testID}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: OFF_TRACK, true: onColor ?? colors.accentColor }}
      ios_backgroundColor={OFF_TRACK}
      thumbColor={THUMB}
    />
  );
};
