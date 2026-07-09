import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LoomTree } from '@domain/entities';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type IoniconsName = keyof typeof Ionicons.glyphMap;

type DrawerNavItem = {
  readonly route: string;
  readonly label: string;
  readonly icon: IoniconsName;
  readonly iconFocused: IoniconsName;
};

const NAV_ITEMS: readonly DrawerNavItem[] = [
  {
    route: 'trees',
    label: 'Loom Trees',
    icon: 'leaf-outline',
    iconFocused: 'leaf',
  },
  {
    route: 'search',
    label: 'Search',
    icon: 'search-outline',
    iconFocused: 'search',
  },
  {
    route: 'settings',
    label: 'Settings',
    icon: 'options-outline',
    iconFocused: 'options',
  },
];

const recency = (tree: LoomTree): number =>
  (tree.lastMessageAt ?? tree.updatedAt).getTime();

/**
 * Slide-out drawer: primary destinations on top, recent loom trees below
 * (Claude/ChatGPT-style navigation).
 */
export const AppDrawerContent = (props: DrawerContentComponentProps) => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const drawerStatus = useDrawerStatus();
  const { repositories } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [trees, setTrees] = useState<LoomTree[]>([]);

  const loadTrees = useCallback(async () => {
    if (!bootstrap) {
      return;
    }
    try {
      const found = await repositories.treeRepo.findByMode(
        bootstrap.groveId,
        'dialogue',
        true
      );
      setTrees([...found].sort((a, b) => recency(b) - recency(a)));
    } catch {
      // Drawer list is best-effort; the trees screen surfaces load errors.
    }
  }, [bootstrap, repositories.treeRepo]);

  // Refresh whenever the drawer opens so new/renamed trees show up.
  useEffect(() => {
    if (drawerStatus === 'open') {
      void loadTrees();
    }
  }, [drawerStatus, loadTrees]);

  const focusedRoute = props.state.routes[props.state.index]?.name;

  const openRoute = (route: string) => {
    props.navigation.navigate(route);
  };

  const openTree = (tree: LoomTree) => {
    props.navigation.closeDrawer();
    router.push({
      pathname: '/tree/[treeId]',
      params: { treeId: tree.id },
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.oppositePrimary,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <AppText variant="title" tone="primary" style={styles.appName}>
        Aspen Grove
      </AppText>

      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const focused = focusedRoute === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => openRoute(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.navRow,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons
                name={focused ? item.iconFocused : item.icon}
                size={20}
                color={focused ? colors.accentColor : colors.primary}
              />
              <AppText
                variant="mono"
                style={[
                  styles.navLabel,
                  { color: focused ? colors.accentColor : colors.primary },
                ]}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="meta" tone="secondary" style={styles.sectionLabel}>
        Recents
      </AppText>
      <FlatList
        data={trees}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.treeListContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openTree(item)}
            style={({ pressed }) => [
              styles.treeRow,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <AppText
              variant="mono"
              tone="primary"
              numberOfLines={1}
              style={styles.treeTitle}
            >
              {item.title}
            </AppText>
          </Pressable>
        )}
        ListEmptyComponent={
          <AppText variant="meta" tone="secondary" style={styles.emptyText}>
            No loom trees yet.
          </AppText>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 24,
    marginBottom: 20,
  },
  navSection: {
    gap: 4,
    marginBottom: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  navLabel: {
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  treeListContent: {
    paddingBottom: 12,
  },
  treeRow: {
    paddingVertical: 11,
  },
  treeTitle: {
    fontSize: 15,
  },
  emptyText: {
    marginTop: 10,
  },
});
