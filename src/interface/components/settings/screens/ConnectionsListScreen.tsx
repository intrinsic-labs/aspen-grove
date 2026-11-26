import { ApiKeysHeroSection } from '../connections/ApiKeysHeroSection';
import { ConnectionsList } from '../connections/ConnectionsList';
import type { ConnectionsScope } from '../connections/connection-routes';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';

type ConnectionsListScreenProps = {
  readonly scope: ConnectionsScope;
};

/**
 * Settings → Connections: Latent Spaces' API Keys page opening (the card on
 * how keys are kept, APIKeySettingsView.swift:20-52), then a row per
 * provider. Each provider's keys or server live on its own screen
 * (`ConnectionProviderScreen`).
 */
export const ConnectionsListScreen = ({
  scope,
}: ConnectionsListScreenProps) => (
  <SettingsScreenScaffold testID="settings-connections-screen">
    <ApiKeysHeroSection />
    <ConnectionsList scope={scope} />
  </SettingsScreenScaffold>
);
