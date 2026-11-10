import { ConnectionsSection } from '../connections/ConnectionsSection';
import { useConnectionsController } from '../connections/useConnectionsController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

const ConnectionsSettingsScreen = () => {
  const controller = useConnectionsController();

  return (
    <SettingsScreenScaffold
      testID="settings-connections-screen"
      loading={controller.loading}
    >
      <ConnectionsSection controller={controller} />
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
