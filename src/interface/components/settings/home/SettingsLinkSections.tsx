import { useRouter } from 'expo-router';
import { FormLinkRow, FormSection } from '@/interface/ui/components/form';

/**
 * "API Settings" (LoomSettingsView.swift:109-117): Latent Spaces' API Keys
 * link. Aspen Grove's counterpart is Connections, which also holds the LM
 * Studio server.
 */
export const ApiSettingsSection = () => {
  const router = useRouter();
  return (
    <FormSection header="API Settings">
      {/* key.2.on.ring */}
      <FormLinkRow
        testID="settings-link-connections"
        title="Connections"
        icon="key-outline"
        onPress={() => router.push('/settings/connections')}
      />
    </FormSection>
  );
};

/**
 * "New loom tree Settings" (LoomSettingsView.swift:120-208). Latent Spaces
 * sets provider, model and parameters for new trees here; in Aspen Grove a
 * new tree takes the default agent, so this links to the Agents library.
 */
export const NewTreeSettingsSection = () => {
  const router = useRouter();
  return (
    <FormSection
      header="New loom tree Settings"
      footer="New loom trees use your default agent: its model, temperature, maximum tokens and system prompt. Each tree can switch or customize its own."
    >
      {/* cpu */}
      <FormLinkRow
        testID="settings-link-agents"
        title="Agents"
        icon="hardware-chip-outline"
        onPress={() => router.push('/settings/agents')}
      />
    </FormSection>
  );
};
