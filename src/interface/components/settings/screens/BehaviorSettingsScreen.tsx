import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppBehaviorSection } from '../AppBehaviorSection';
import { useAppearanceController } from '../appearance/useAppearanceController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

const BehaviorSettingsScreen = () => {
  const { colors } = useAspenGroveTheme();
  const appearance = useAppearanceController();

  return (
    <SettingsScreenScaffold
      testID="settings-behavior-screen"
      loading={appearance.loading}
    >
      <AppBehaviorSection
        verboseErrorAlerts={appearance.verboseErrorAlerts}
        onChangeVerboseErrorAlerts={appearance.setVerboseErrorAlerts}
        autoTitleEnabled={appearance.autoTitleEnabled}
        onChangeAutoTitleEnabled={appearance.setAutoTitleEnabled}
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
