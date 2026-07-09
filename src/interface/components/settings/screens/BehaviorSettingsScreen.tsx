import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppBehaviorSection } from '../AppBehaviorSection';
import { useAppearanceController } from '../appearance/useAppearanceController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

const BehaviorSettingsScreen = () => {
  const { colors, isDark } = useAspenGroveTheme();
  const appearance = useAppearanceController();

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <SettingsScreenScaffold loading={appearance.loading}>
      <AppBehaviorSection
        verboseErrorAlerts={appearance.verboseErrorAlerts}
        onChangeVerboseErrorAlerts={appearance.setVerboseErrorAlerts}
        autoTitleEnabled={appearance.autoTitleEnabled}
        onChangeAutoTitleEnabled={appearance.setAutoTitleEnabled}
        switchOffTrack={switchOffTrack}
        colors={colors}
      />
      <SettingsStatus
        saving={appearance.saving}
        notice={null}
        error={appearance.error}
        hasValidationError={false}
      />
    </SettingsScreenScaffold>
  );
};

export default BehaviorSettingsScreen;
