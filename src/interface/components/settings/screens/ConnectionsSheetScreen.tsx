import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppScreen, AppText } from '@/interface/ui/value-objects';
import ConnectionsSettingsScreen from './ConnectionsSettingsScreen';

/**
 * Settings → Connections as a sheet over the current screen, for the
 * "Add key" and "Open Connections" actions on Home, Loom Trees and a failed
 * generation. It closes back to where the user was, so a tree stays open.
 */
const ConnectionsSheetScreen = () => {
  const { colors } = useAspenGroveTheme();
  const router = useRouter();

  return (
    <AppScreen testID="connections-sheet">
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <View style={styles.side} />
        <AppText variant="ui" style={styles.title}>
          Connections
        </AppText>
        <View style={[styles.side, styles.right]}>
          <Pressable
            testID="connections-sheet-done"
            onPress={() => router.back()}
            hitSlop={8}
          >
            <AppText variant="meta" tone="accent">
              Done
            </AppText>
          </Pressable>
        </View>
      </View>
      <ConnectionsSettingsScreen />
    </AppScreen>
  );
};

export default ConnectionsSheetScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    minWidth: 60,
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
