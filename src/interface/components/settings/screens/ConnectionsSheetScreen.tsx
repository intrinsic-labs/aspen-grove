import { useRouter } from 'expo-router';
import { FormSheetHeader } from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import ConnectionsSettingsScreen from './ConnectionsSettingsScreen';

/**
 * Settings → Connections as a sheet over the current screen, for the
 * "Add key" and "Open Connections" actions on Home, Loom Trees and a failed
 * generation. It closes back to where the user was, so a tree stays open.
 * Its bar is a sheet's: the title with a glass Done capsule.
 */
const ConnectionsSheetScreen = () => {
  const router = useRouter();

  return (
    <AppScreen testID="connections-sheet">
      <FormSheetHeader
        title="Connections"
        trailing={{
          label: 'Done',
          onPress: () => router.back(),
          testID: 'connections-sheet-done',
        }}
      />
      <ConnectionsSettingsScreen />
    </AppScreen>
  );
};

export default ConnectionsSheetScreen;
