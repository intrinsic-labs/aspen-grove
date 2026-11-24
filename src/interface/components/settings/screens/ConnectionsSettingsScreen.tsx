import { ApiKeysHeroSection } from '../connections/ApiKeysHeroSection';
import { LmStudioFormSection } from '../connections/LmStudioFormSection';
import { PROVIDER_KEY_CONFIGS } from '../connections/provider-key-config';
import { ProviderKeyConnection } from '../connections/ProviderKeyConnection';
import { useConnectionsController } from '../connections/useConnectionsController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

/**
 * Settings → Connections: Latent Spaces' API Keys page
 * (APIKeySettingsView.swift) with a key section per hosted provider
 * (OpenRouter, Anthropic, OpenAI) and Aspen Grove's LM Studio server below.
 */
const ConnectionsSettingsScreen = () => {
  const controller = useConnectionsController();

  return (
    <SettingsScreenScaffold
      testID="settings-connections-screen"
      loading={controller.loading}
    >
      <ApiKeysHeroSection />
      {PROVIDER_KEY_CONFIGS.map((config) => (
        <ProviderKeyConnection key={config.provider} config={config} />
      ))}
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

export default ConnectionsSettingsScreen;
