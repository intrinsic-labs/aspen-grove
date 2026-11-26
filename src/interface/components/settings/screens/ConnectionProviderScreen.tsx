import { useLocalSearchParams } from 'expo-router';
import { connectionProvider } from '../connections/connection-provider';
import { LmStudioConnectionScreen } from '../connections/LmStudioConnectionScreen';
import { providerKeyConfig } from '../connections/provider-key-config';
import { ProviderKeyConnection } from '../connections/ProviderKeyConnection';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';

/**
 * One provider's Connections screen, titled with its name: a hosted
 * provider's key section and sheet, or LM Studio's server section. The
 * sections are the ones Connections used to stack in one page.
 */
export const ConnectionProviderScreen = () => {
  const { provider: param } = useLocalSearchParams<{ provider?: string }>();
  const provider = connectionProvider(param);

  if (provider === 'lmstudio') {
    return <LmStudioConnectionScreen />;
  }
  return (
    <SettingsScreenScaffold testID="connections-provider-screen">
      {provider ? (
        <ProviderKeyConnection config={providerKeyConfig(provider)} />
      ) : null}
    </SettingsScreenScaffold>
  );
};
