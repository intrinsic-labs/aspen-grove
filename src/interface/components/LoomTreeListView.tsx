import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CreateDialogueLoomTreeUseCase } from '@application/use-cases';
import { initializeAppDefaults } from '@infrastructure/bootstrap';
import database from '@infrastructure/persistence/watermelon/index.native';
import {
  WatermelonAgentRepository,
  WatermelonGroveRepository,
  WatermelonLoomTreeRepository,
  WatermelonNodeRepository,
  WatermelonPathRepository,
  WatermelonPathStateRepository,
} from '@infrastructure/persistence/watermelon/repositories';
import type { LoomTree } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useThemeColors } from '../hooks/useThemeColors';
import { AppScreen, AppText, Hairline } from '../ui/system';

type StartupState = {
  readonly groveId: ULID;
  readonly ownerAgentId: ULID;
};

const LoomTreeListView = () => {
  const { colors } = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();

  const repos = useMemo(
    () => ({
      groveRepo: new WatermelonGroveRepository(database),
      agentRepo: new WatermelonAgentRepository(database),
      treeRepo: new WatermelonLoomTreeRepository(database),
      nodeRepo: new WatermelonNodeRepository(database),
      pathRepo: new WatermelonPathRepository(database),
      pathStateRepo: new WatermelonPathStateRepository(database),
    }),
    []
  );

  const createTreeUseCase = useMemo(
    () =>
      new CreateDialogueLoomTreeUseCase({
        groveRepository: repos.groveRepo,
        agentRepository: repos.agentRepo,
        loomTreeRepository: repos.treeRepo,
        nodeRepository: repos.nodeRepo,
        pathRepository: repos.pathRepo,
        pathStateRepository: repos.pathStateRepo,
      }),
    [repos]
  );

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<LoomTree[]>([]);
  const [startup, setStartup] = useState<StartupState | null>(null);

  const loadTrees = useCallback(
    async (groveId: ULID) => {
      const found = await repos.treeRepo.findByMode(groveId, 'dialogue', true);
      const sorted = [...found].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      );
      setTrees(sorted);
    },
    [repos.treeRepo]
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        const boot = await initializeAppDefaults(database);
        const nextStartup: StartupState = {
          groveId: boot.grove.id as ULID,
          ownerAgentId: boot.ownerAgent.id as ULID,
        };

        setStartup(nextStartup);
        await loadTrees(nextStartup.groveId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [loadTrees]);

  useFocusEffect(
    useCallback(() => {
      if (startup) {
        void loadTrees(startup.groveId);
      }
      return undefined;
    }, [loadTrees, startup])
  );

  const onCreateTree = useCallback(async () => {
    if (!startup || creating) {
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const created = await createTreeUseCase.execute({
        groveId: startup.groveId,
        ownerAgentId: startup.ownerAgentId,
        initialContent: {
          type: 'text',
          text: '',
        },
        pathName: 'Main',
      });

      router.push({
        pathname: '/tree/[treeId]',
        params: {
          treeId: created.tree.id,
          autofocus: '1',
          ephemeral: '1',
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setCreating(false);
    }
  }, [createTreeUseCase, creating, router, startup]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: {
        paddingRight: 14,
      },
      headerRight: () => (
        <Pressable
          onPress={onCreateTree}
          disabled={loading || creating || !startup}
          style={({ pressed }) => [
            styles.headerAddButton,
            {
              borderColor: colors.line,
              opacity: pressed || creating ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons
            name={creating ? 'ellipsis-horizontal' : 'add'}
            size={20}
            color={colors.primary}
          />
        </Pressable>
      ),
    });
  }, [colors.line, colors.primary, creating, loading, navigation, onCreateTree, startup]);

  const onOpenTree = (tree: LoomTree) => {
    router.push({
      pathname: '/tree/[treeId]',
      params: {
        treeId: tree.id,
      },
    });
  };

  const renderTree = ({ item }: { item: LoomTree }) => {
    return (
      <Pressable onPress={() => onOpenTree(item)} style={styles.treeRow}>
        <AppText variant="mono" tone="primary" style={styles.treeTitle}>
          {item.title}
        </AppText>
        <AppText variant="meta" tone="secondary" style={styles.treeMeta}>
          Last updated {item.updatedAt.toLocaleString()}
        </AppText>
      </Pressable>
    );
  };

  return (
    <AppScreen>
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={trees}
          keyExtractor={(item) => item.id}
          renderItem={renderTree}
          ItemSeparatorComponent={() => <Hairline style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <AppText variant="meta" tone="secondary" style={styles.emptyText}>
              No dialogue trees yet. Press + to create one.
            </AppText>
          }
        />
      )}

      {error ? (
        <AppText variant="meta" tone="accent" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </AppScreen>
  );
};

export default LoomTreeListView;

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  treeRow: {
    paddingVertical: 15,
  },
  separator: {
    marginVertical: 1,
  },
  headerAddButton: {
    height: 36,
    width: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeTitle: {
    fontSize: 18,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  treeMeta: {
    fontSize: 11,
  },
  emptyText: {
    marginTop: 18,
  },
  errorText: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
});
