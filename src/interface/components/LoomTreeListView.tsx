import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import { useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { LoomTree, Tag } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { pickAndReadTextFile } from '@interface/services/loom-file-sharing';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { useCreateLoomTree } from '../hooks/useCreateLoomTree';
import {
  AppScreen,
  AppText,
  Hairline,
  HeaderIconButton,
} from '../ui/value-objects';

type ListMenuAction = 'create' | 'import';

const LIST_MENU_ITEMS: readonly {
  readonly action: ListMenuAction;
  readonly title: string;
  readonly systemIcon: string;
}[] = [
  { action: 'create', title: 'New Tree', systemIcon: 'plus' },
  {
    action: 'import',
    title: 'Import Tree',
    systemIcon: 'square.and.arrow.down',
  },
];

const LoomTreeListView = () => {
  const { colors } = useAspenGroveTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { repositories, useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<LoomTree[]>([]);
  const [groveTags, setGroveTags] = useState<readonly Tag[]>([]);
  const [activeTagId, setActiveTagId] = useState<ULID | null>(null);
  const [taggedTreeIds, setTaggedTreeIds] = useState<ReadonlySet<ULID> | null>(
    null
  );

  const loadTrees = useCallback(async () => {
    if (!bootstrap) {
      return;
    }

    const found = await repositories.treeRepo.findByMode(
      bootstrap.groveId,
      'dialogue',
      true
    );
    // Most recently conversed-with tree first. `lastMessageAt` only moves on
    // dialogue turns; fall back to `updatedAt` for trees predating the field.
    const recency = (tree: LoomTree) =>
      (tree.lastMessageAt ?? tree.updatedAt).getTime();
    const sorted = [...found].sort((a, b) => recency(b) - recency(a));
    setTrees(sorted);

    const tags = await repositories.tagRepo.findTagsByGroveId(
      bootstrap.groveId
    );
    setGroveTags(tags);
  }, [bootstrap, repositories.tagRepo, repositories.treeRepo]);

  // Tag filter: resolve the selected tag to its tagged tree ids.
  useEffect(() => {
    if (!activeTagId) {
      setTaggedTreeIds(null);
      return;
    }
    let cancelled = false;
    void repositories.tagRepo
      .findItemsByTag(activeTagId, 'loomTree')
      .then((assignments) => {
        if (!cancelled) {
          setTaggedTreeIds(new Set(assignments.map((a) => a.targetId)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTaggedTreeIds(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTagId, repositories.tagRepo]);

  const visibleTrees = taggedTreeIds
    ? trees.filter((tree) => taggedTreeIds.has(tree.id))
    : trees;

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

  const { creating, createTree: onCreateTree } = useCreateLoomTree(setError);

  const onImportTree = useCallback(async () => {
    if (!bootstrap || importing) {
      return;
    }

    try {
      setError(null);
      const picked = await pickAndReadTextFile();
      if (!picked) {
        return;
      }
      setImporting(true);

      const result = await useCases.importLoomTreeUseCase.execute({
        groveId: bootstrap.groveId,
        ownerAgentId: bootstrap.ownerAgentId,
        raw: picked.content,
      });

      await loadTrees();

      const summary = result.trees
        .map((tree) => `“${tree.title}” (${tree.nodeCount} nodes)`)
        .join(', ');
      Alert.alert(
        'Import complete',
        [`Imported ${summary} from ${result.sourceFormat}.`, ...result.warnings]
          .join('\n\n')
          .trim()
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setImporting(false);
    }
  }, [bootstrap, importing, loadTrees, useCases.importLoomTreeUseCase]);

  const busy = loading || creating || importing || !bootstrap;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ContextMenu
          dropdownMenuMode
          actions={LIST_MENU_ITEMS.map((item) => ({
            title: item.title,
            systemIcon: item.systemIcon,
            disabled: busy,
          }))}
          onPress={(event) => {
            const menuItem = LIST_MENU_ITEMS[event.nativeEvent.index];
            if (!menuItem || busy) {
              return;
            }
            if (menuItem.action === 'create') {
              void onCreateTree();
            } else {
              void onImportTree();
            }
          }}
        >
          <HeaderIconButton
            icon={
              creating || importing
                ? 'hourglass-outline'
                : 'ellipsis-horizontal'
            }
            accessibilityLabel="Loom trees menu"
          />
        </ContextMenu>
      ),
    });
  }, [busy, creating, importing, navigation, onCreateTree, onImportTree]);

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
          {item.lastMessageAt
            ? `Last message ${item.lastMessageAt.toLocaleString()}`
            : `Last updated ${item.updatedAt.toLocaleString()}`}
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
        <>
          {groveTags.length > 0 ? (
            <View style={styles.tagFilterRow}>
              {groveTags.map((tag) => {
                const active = tag.id === activeTagId;
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() =>
                      setActiveTagId((current) =>
                        current === tag.id ? null : tag.id
                      )
                    }
                    style={[
                      styles.tagChip,
                      {
                        borderColor: active
                          ? colors.accentColor
                          : colors.surface,
                        backgroundColor: active
                          ? colors.surface
                          : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="meta"
                      style={{
                        color: active ? colors.accentColor : colors.secondary,
                      }}
                    >
                      {tag.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <FlatList
            data={visibleTrees}
            keyExtractor={(item) => item.id}
            renderItem={renderTree}
            ItemSeparatorComponent={() => <Hairline style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <AppText variant="meta" tone="secondary" style={styles.emptyText}>
                {activeTagId
                  ? 'No trees with this tag.'
                  : 'No dialogue trees yet. Open the ··· menu to create one.'}
              </AppText>
            }
          />
        </>
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
  tagFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
