import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { Content, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen, AppText, Hairline } from '../ui/value-objects';

const SEARCH_DEBOUNCE_MS = 250;
const SNIPPET_RADIUS = 60;

const contentToPlainText = (content: Content): string => {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'mixed':
      return content.blocks.map(contentToPlainText).join(' ');
    case 'image':
      return content.altText ?? '';
    case 'audio':
      return '';
  }
};

const makeSnippet = (text: string, term: string): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const index = normalized.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) {
    return normalized.slice(0, SNIPPET_RADIUS * 2);
  }
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(normalized.length, index + term.length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${
    end < normalized.length ? '…' : ''
  }`;
};

type SearchSection = {
  readonly treeId: ULID;
  readonly title: string;
  readonly data: Node[];
};

const SearchView = () => {
  const { colors } = useAspenGroveTheme();
  const router = useRouter();
  const { repositories } = useAppServices();

  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    async (term: string) => {
      const requestId = ++requestIdRef.current;
      if (term.trim().length < 2) {
        setSections([]);
        setSearching(false);
        return;
      }

      try {
        setSearching(true);
        setError(null);
        const nodes = await repositories.nodeRepo.searchByContent(term, 100);
        if (requestId !== requestIdRef.current) {
          return;
        }

        // Group by tree, resolve titles, keep result order inside groups.
        const byTree = new Map<ULID, Node[]>();
        for (const node of nodes) {
          const list = byTree.get(node.loomTreeId) ?? [];
          list.push(node);
          byTree.set(node.loomTreeId, list);
        }
        const nextSections: SearchSection[] = [];
        for (const [treeId, treeNodes] of byTree) {
          const tree = await repositories.treeRepo.findById(treeId);
          if (!tree || tree.archivedAt) {
            continue;
          }
          nextSections.push({ treeId, title: tree.title, data: treeNodes });
        }
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSections(nextSections);
      } catch (caught) {
        if (requestId === requestIdRef.current) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [repositories.nodeRepo, repositories.treeRepo]
  );

  useEffect(() => {
    const timeout = setTimeout(() => void runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, runSearch]);

  const openResult = useCallback(
    (node: Node) => {
      Keyboard.dismiss();
      router.push({
        pathname: '/tree/[treeId]/node/[nodeId]',
        params: { treeId: node.loomTreeId, nodeId: node.id },
      });
    },
    [router]
  );

  const openTree = useCallback(
    (treeId: ULID) => {
      Keyboard.dismiss();
      router.push({ pathname: '/tree/[treeId]', params: { treeId } });
    },
    [router]
  );

  const trimmedQuery = query.trim();
  const emptyMessage = useMemo(() => {
    if (trimmedQuery.length < 2) {
      return 'Search across every loom tree. Type at least two characters.';
    }
    if (searching) {
      return null;
    }
    return `No matches for “${trimmedQuery}”.`;
  }, [searching, trimmedQuery]);

  return (
    <AppScreen style={styles.container}>
      <View style={styles.searchBarRow}>
        <View
          style={[
            styles.searchBar,
            { borderColor: colors.surface, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.secondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search node content…"
            placeholderTextColor={colors.secondaryVariant}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={() => Keyboard.dismiss()}
            style={[styles.searchInput, { color: colors.primary }]}
          />
          {query.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.secondaryVariant}
              />
            </Pressable>
          ) : null}
        </View>
        {inputFocused ? (
          <Pressable hitSlop={8} onPress={() => Keyboard.dismiss()}>
            <AppText variant="ui" tone="accent" style={styles.doneButton}>
              Done
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SectionList<Node, SearchSection>
          sections={sections}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() => openTree(section.treeId)}
              style={styles.sectionHeader}
            >
              <AppText
                variant="ui"
                tone="primary"
                style={styles.sectionTitle}
              >
                {section.title}
              </AppText>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.secondaryVariant}
              />
            </Pressable>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openResult(item)}
              style={styles.resultRow}
            >
              <AppText
                variant="meta"
                tone="secondary"
                style={styles.resultMeta}
              >
                {item.authorType === 'model' ? 'model' : 'human'} ·{' '}
                {item.createdAt.toLocaleDateString()}
              </AppText>
              <AppText tone="primary" style={styles.resultSnippet}>
                {makeSnippet(contentToPlainText(item.content), trimmedQuery)}
              </AppText>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <Hairline style={styles.separator} />}
          ListEmptyComponent={
            emptyMessage ? (
              <AppText variant="meta" tone="secondary" style={styles.emptyText}>
                {emptyMessage}
              </AppText>
            ) : null
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

export default SearchView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  resultRow: {
    paddingVertical: 10,
    gap: 4,
  },
  resultMeta: {
    fontSize: 10,
  },
  resultSnippet: {
    fontSize: 13,
    lineHeight: 19,
  },
  separator: {
    marginVertical: 1,
  },
  emptyText: {
    marginTop: 18,
  },
  errorText: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
});
