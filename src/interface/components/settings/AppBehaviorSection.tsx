import {
  AppSwitch,
  SettingsInlineRow,
  SettingsSection,
} from '@/interface/ui/value-objects';

type AppBehaviorSectionProps = {
  readonly verboseErrorAlerts: boolean;
  readonly onChangeVerboseErrorAlerts: (value: boolean) => void;
  readonly autoTitleEnabled: boolean;
  readonly onChangeAutoTitleEnabled: (value: boolean) => void;
  readonly colors: {
    readonly red: string;
  };
};

export const AppBehaviorSection = ({
  verboseErrorAlerts,
  onChangeVerboseErrorAlerts,
  autoTitleEnabled,
  onChangeAutoTitleEnabled,
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
          <AppSwitch
            testID="settings-behavior-auto-title"
            value={autoTitleEnabled}
            onValueChange={onChangeAutoTitleEnabled}
          />
        }
      />
      <SettingsInlineRow
        label="Verbose Error Alerts"
        trailing={
          <AppSwitch
            testID="settings-behavior-verbose-errors"
            value={verboseErrorAlerts}
            onValueChange={onChangeVerboseErrorAlerts}
            onColor={colors.red}
          />
        }
      />
    </SettingsSection>
  );
};

