import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tag } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type TreeTagsSheetProps = {
  readonly visible: boolean;
  readonly treeId: ULID | null;
  readonly onClose: () => void;
};

/**
 * Minimal tag management for a tree: toggle grove tags on/off, create a
 * new tag inline. (Tag-filtering lives in the tree list.)
 */
export const TreeTagsSheet = ({
  visible,
  treeId,
  onClose,
}: TreeTagsSheetProps) => {
  const { colors } = useAspenGroveTheme();
  const { repositories } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const groveId =
    bootstrapState.status === 'ready' ? bootstrapState.result.groveId : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<readonly Tag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<ReadonlySet<ULID>>(
    new Set()
  );
  const [newTagName, setNewTagName] = useState('');

  const refresh = useCallback(async () => {
    if (!groveId || !treeId) {
      return;
    }
    const [tags, assigned] = await Promise.all([
      repositories.tagRepo.findTagsByGroveId(groveId),
      repositories.tagRepo.findTagsForItem('loomTree', treeId),
    ]);
    setAllTags(tags);
    setAssignedTagIds(new Set(assigned.map((tag) => tag.id)));
  }, [groveId, repositories.tagRepo, treeId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    refresh()
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refresh, visible]);

  const toggleTag = useCallback(
    async (tag: Tag) => {
      if (!treeId) {
        return;
      }
      try {
        setError(null);
        if (assignedTagIds.has(tag.id)) {
          await repositories.tagRepo.unassignTag(tag.id, 'loomTree', treeId);
        } else {
          await repositories.tagRepo.assignTag(tag.id, 'loomTree', treeId);
        }
        await refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [assignedTagIds, refresh, repositories.tagRepo, treeId]
  );

  const createAndAssignTag = useCallback(async () => {
    const name = newTagName.trim();
    if (!groveId || !treeId || name.length === 0) {
      return;
    }
    try {
      setError(null);
      const existing = await repositories.tagRepo.findTagByName(groveId, name);
      const tag =
        existing ?? (await repositories.tagRepo.createTag({ groveId, name }));
      await repositories.tagRepo.assignTag(tag.id, 'loomTree', treeId);
      setNewTagName('');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [groveId, newTagName, refresh, repositories.tagRepo, treeId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: colors.oppositePrimary }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <View style={styles.headerSide} />
          <AppText variant="mono" style={styles.headerTitle}>
            Tags
          </AppText>
          <Pressable onPress={onClose} hitSlop={8} style={styles.headerSide}>
            <AppText
              variant="meta"
              style={{ color: colors.primary, textAlign: 'right' }}
            >
              Done
            </AppText>
          </Pressable>
        </View>

        <View style={[styles.newTagRow, { borderBottomColor: colors.line }]}>
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="New tag…"
            placeholderTextColor={colors.secondaryVariant}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void createAndAssignTag()}
            style={[styles.newTagInput, { color: colors.primary }]}
          />
          <Pressable
            onPress={() => void createAndAssignTag()}
            disabled={newTagName.trim().length === 0}
            hitSlop={8}
          >
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={
                newTagName.trim().length === 0
                  ? colors.secondaryVariant
                  : colors.accentColor
              }
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : allTags.length === 0 ? (
          <View style={styles.centerWrap}>
            <AppText variant="meta" tone="muted">
              No tags yet. Create one above to label this tree.
            </AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {allTags.map((tag) => {
              const assigned = assignedTagIds.has(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => void toggleTag(tag)}
                  style={({ pressed }) => [
                    styles.tagRow,
                    { borderBottomColor: colors.line },
                    { opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <AppText variant="mono" tone="primary" style={styles.tagName}>
                    {tag.name}
                  </AppText>
                  <Ionicons
                    name={assigned ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={assigned ? colors.accentColor : colors.secondaryVariant}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {error ? (
          <AppText variant="meta" tone="accent" style={styles.errorText}>
            {error}
          </AppText>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    width: 48,
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  newTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  newTagInput: {
    flex: 1,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
    padding: 0,
  },
  centerWrap: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagName: {
    fontSize: 14,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
