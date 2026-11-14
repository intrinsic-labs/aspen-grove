import { AgentsSection } from '../agents/AgentsSection';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';

const AgentsSettingsScreen = () => (
  <SettingsScreenScaffold testID="settings-agents-screen">
    <AgentsSection />
  </SettingsScreenScaffold>
);

export default AgentsSettingsScreen;
