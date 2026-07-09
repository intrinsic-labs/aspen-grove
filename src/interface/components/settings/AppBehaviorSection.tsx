import { Switch } from 'react-native';
import { SettingsInlineRow, SettingsSection } from '@/interface/ui/value-objects';

type AppBehaviorSectionProps = {
  readonly verboseErrorAlerts: boolean;
  readonly onChangeVerboseErrorAlerts: (value: boolean) => void;
  readonly autoTitleEnabled: boolean;
  readonly onChangeAutoTitleEnabled: (value: boolean) => void;
  readonly switchOffTrack: string;
  readonly colors: {
    readonly red: string;
    readonly accentColor: string;
    readonly onSurface: string;
  };
};

export const AppBehaviorSection = ({
  verboseErrorAlerts,
  onChangeVerboseErrorAlerts,
  autoTitleEnabled,
  onChangeAutoTitleEnabled,
  switchOffTrack,
  colors,
}: AppBehaviorSectionProps) => {
  return (
    <SettingsSection
      title="App Behavior"
      footer="Auto-title asks the tree's model for a short conversation title after the first response. Verbose alerts show detailed provider failures in UI."
    >
      <SettingsInlineRow
        label="Auto-Title Conversations"
        trailing={
          <Switch
            value={autoTitleEnabled}
            onValueChange={onChangeAutoTitleEnabled}
            trackColor={{
              false: switchOffTrack,
              true: colors.accentColor,
            }}
            thumbColor={colors.onSurface}
          />
        }
      />
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

