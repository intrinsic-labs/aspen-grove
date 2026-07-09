import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useCreateLoomTree } from '@/interface/hooks/useCreateLoomTree';
import {
  AppPillButton,
  AppScreen,
  AppText,
} from '@/interface/ui/value-objects';

const greetingForHour = (hour: number): string => {
  if (hour < 5) {
    return 'Up late';
  }
  if (hour < 12) {
    return 'Morning';
  }
  if (hour < 18) {
    return 'Afternoon';
  }
  return 'Evening';
};

/**
 * Home screen: a quiet welcome with a single entry point into a new tree.
 * Everything else lives in the slide-out drawer.
 */
const WelcomeView = () => {
  const { colors } = useAspenGroveTheme();
  const { repositories } = useAppServices();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { creating, createTree, ready } = useCreateLoomTree(setError);

  useEffect(() => {
    let cancelled = false;
    void repositories.userPreferencesRepo
      .get()
      .then((preferences) => {
        if (!cancelled) {
          setDisplayName(preferences.displayName?.trim() || null);
        }
      })
      .catch(() => {
        // Greeting falls back to the nameless variant.
      });
    return () => {
      cancelled = true;
    };
  }, [repositories.userPreferencesRepo]);

  const greeting = greetingForHour(new Date().getHours());

  return (
    <AppScreen style={styles.container}>
      <View style={styles.centerWrap}>
        <Ionicons name="leaf" size={34} color={colors.accentColor} />
        <AppText variant="body" tone="primary" style={styles.greeting}>
          {displayName ? `${greeting}, ${displayName}` : `${greeting}`}
        </AppText>
        <AppPillButton
          label={creating ? 'Creating…' : 'New Loom Tree'}
          variant="outline"
          disabled={creating || !ready}
          onPress={() => void createTree()}
          style={styles.newTreeButton}
        />
      </View>

      {error ? (
        <AppText variant="meta" tone="accent" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </AppScreen>
  );
};

export default WelcomeView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 32,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  newTreeButton: {
    marginTop: 8,
  },
  errorText: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    textAlign: 'center',
  },
});
