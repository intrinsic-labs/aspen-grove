import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { ConnectionsSection } from '../connections/ConnectionsSection';
import { useConnectionsController } from '../connections/useConnectionsController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

const ConnectionsSettingsScreen = () => {
  const { colors, isDark } = useAspenGroveTheme();
  const controller = useConnectionsController();

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <SettingsScreenScaffold loading={controller.loading}>
      <ConnectionsSection
        controller={controller}
        switchOffTrack={switchOffTrack}
        colors={colors}
      />
      <SettingsStatus
        saving={controller.saving}
        notice={null}
        error={controller.error}
        hasValidationError={false}
      />
    </SettingsScreenScaffold>
  );
};

export default ConnectionsSettingsScreen;
