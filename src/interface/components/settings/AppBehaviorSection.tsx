import { Switch } from 'react-native';
import { SettingsInlineRow, SettingsSection } from '@interface/ui/system';

type AppBehaviorSectionProps = {
  readonly verboseErrorAlerts: boolean;
  readonly onChangeVerboseErrorAlerts: (value: boolean) => void;
  readonly switchOffTrack: string;
  readonly colors: {
    readonly red: string;
    readonly onSurface: string;
  };
};

export const AppBehaviorSection = ({
  verboseErrorAlerts,
  onChangeVerboseErrorAlerts,
  switchOffTrack,
  colors,
}: AppBehaviorSectionProps) => {
  return (
    <SettingsSection
      title="App Behavior"
      footer="Show detailed provider failures in UI."
    >
      <SettingsInlineRow
        label="Verbose Error Alerts"
        trailing={
          <Switch
            value={verboseErrorAlerts}
            onValueChange={onChangeVerboseErrorAlerts}
            trackColor={{
              false: switchOffTrack,
              true: colors.red,
            }}
            thumbColor={colors.onSurface}
          />
        }
      />
    </SettingsSection>
  );
};

