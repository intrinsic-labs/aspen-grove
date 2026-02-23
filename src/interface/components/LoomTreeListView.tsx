import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import type { LoomTree } from '@domain/entities';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { useThemeColors } from '../hooks/useThemeColors';
import { AppScreen, AppText, Hairline } from '../ui/system';

const LoomTreeListView = () => {
  const { colors } = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { repositories, useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap = bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<LoomTree[]>([]);

  const loadTrees = useCallback(async () => {
    if (!bootstrap) {
      return;
    }

    const found = await repositories.treeRepo.findByMode(
      bootstrap.groveId,
      'dialogue',
      true
    );
    const sorted = [...found].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    setTrees(sorted);
  }, [bootstrap, repositories.treeRepo]);

  useEffect(() => {
    const refresh = async () => {
      if (!bootstrap) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await loadTrees();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoading(false);
      }
    };

    void refresh();
  }, [bootstrap, loadTrees]);

  useFocusEffect(
    useCallback(() => {
      if (bootstrap) {
        void loadTrees();
      }
      return undefined;
    }, [bootstrap, loadTrees])
  );

  const onCreateTree = useCallback(async () => {
    if (!bootstrap || creating) {
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const created = await useCases.createDialogueLoomTreeUseCase.execute({
        groveId: bootstrap.groveId,
        ownerAgentId: bootstrap.ownerAgentId,
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
  }, [bootstrap, creating, router, useCases.createDialogueLoomTreeUseCase]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: {
        paddingRight: 14,
      },
      headerRight: () => (
        <Pressable
          onPress={onCreateTree}
          disabled={loading || creating || !bootstrap}
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
  }, [bootstrap, colors.line, colors.primary, creating, loading, navigation, onCreateTree]);

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

