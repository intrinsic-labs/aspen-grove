import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppScreen, AppText, Hairline } from '@/interface/ui/value-objects';

type SettingsLink = {
  readonly route:
    | '/settings/agents'
    | '/settings/connections'
    | '/settings/typography'
    | '/settings/behavior';
  readonly title: string;
  readonly subtitle: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
};

const LINKS: readonly SettingsLink[] = [
  {
    route: '/settings/agents',
    title: 'Agents',
    subtitle: 'Shared agent library, default agent, model selection',
    icon: 'people-outline',
  },
  {
    route: '/settings/connections',
    title: 'Connections',
    subtitle: 'OpenRouter key, LM Studio endpoint',
    icon: 'link-outline',
  },
  {
    route: '/settings/typography',
    title: 'Message Typography',
    subtitle: 'Font, size, message styling',
    icon: 'text-outline',
  },
  {
    route: '/settings/behavior',
    title: 'App Behavior',
    subtitle: 'Auto-titles, error alerts',
    icon: 'options-outline',
  },
];

/** Settings root: a sectioned list of links into the settings sub-screens. */
const SettingsHomeView = () => {
  const { colors } = useAspenGroveTheme();
  const router = useRouter();

  return (
    <AppScreen>
      <View style={styles.list}>
        {LINKS.map((link, index) => (
          <View key={link.route}>
            {index > 0 ? <Hairline /> : null}
            <Pressable
              onPress={() => router.push(link.route)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons name={link.icon} size={20} color={colors.primary} />
              <View style={styles.rowText}>
                <AppText variant="ui" tone="primary" style={styles.rowTitle}>
                  {link.title}
                </AppText>
                <AppText
                  variant="meta"
                  tone="secondary"
                  style={styles.rowSubtitle}
                >
                  {link.subtitle}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.secondaryVariant}
              />
            </Pressable>
          </View>
        ))}
      </View>
    </AppScreen>
  );
};

export default SettingsHomeView;

const styles = StyleSheet.create({
  list: {
    marginTop: 12,
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 11,
  },
});
