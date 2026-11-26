import { LmStudioFormSection } from './LmStudioFormSection';
import { useConnectionsController } from './useConnectionsController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

/** LM Studio's screen: its server section, autosaved. */
export const LmStudioConnectionScreen = () => {
  const controller = useConnectionsController();
  return (
    <SettingsScreenScaffold
      testID="connections-provider-screen"
      loading={controller.loading}
    >
      <LmStudioFormSection controller={controller} />
      <SettingsStatus
        saving={controller.saving}
        notice={null}
        error={controller.error}
        hasValidationError={false}
      />
    </SettingsScreenScaffold>
  );
};
