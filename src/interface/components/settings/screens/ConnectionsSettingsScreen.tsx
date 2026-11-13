import { useState } from 'react';
import { ApiKeysHeroSection } from '../connections/ApiKeysHeroSection';
import { LmStudioFormSection } from '../connections/LmStudioFormSection';
import { OpenRouterKeySection } from '../connections/OpenRouterKeySection';
import { OpenRouterKeySheet } from '../connections/OpenRouterKeySheet';
import { useConnectionsController } from '../connections/useConnectionsController';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

/**
 * Settings → Connections: Latent Spaces' API Keys page
 * (APIKeySettingsView.swift) with OpenRouter in place of Anthropic and
 * Aspen Grove's LM Studio server below it.
 */
const ConnectionsSettingsScreen = () => {
  const controller = useConnectionsController();
  const [editingKey, setEditingKey] = useState(false);

  return (
    <SettingsScreenScaffold
      testID="settings-connections-screen"
      loading={controller.loading}
    >
      <ApiKeysHeroSection />
      <OpenRouterKeySection
        hasStoredKey={controller.hasStoredApiKey}
        onEditKey={() => setEditingKey(true)}
      />
      <LmStudioFormSection controller={controller} />
      <SettingsStatus
        saving={controller.saving}
        notice={null}
        error={controller.error}
        hasValidationError={false}
      />
      <OpenRouterKeySheet
        visible={editingKey}
        currentKey={controller.apiKeyInput}
        onCancel={() => setEditingKey(false)}
        onSave={(key) => {
          controller.setApiKeyInput(key);
          setEditingKey(false);
        }}
      />
    </SettingsScreenScaffold>
  );
};

export default ConnectionsSettingsScreen;
