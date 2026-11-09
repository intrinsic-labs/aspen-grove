import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AgentsSection } from '../agents/AgentsSection';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';

const AgentsSettingsScreen = () => {
  const { colors } = useAspenGroveTheme();
  return (
    <SettingsScreenScaffold testID="settings-agents-screen">
      <AgentsSection colors={colors} />
    </SettingsScreenScaffold>
  );
};

export default AgentsSettingsScreen;
