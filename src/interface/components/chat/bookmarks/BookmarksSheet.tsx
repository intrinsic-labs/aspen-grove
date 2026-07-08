import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type BookmarkRow = {
  readonly nodeId: ULID;
  readonly localId: string;
  readonly label?: string;
  readonly authorType: 'human' | 'model';
  readonly previewText: string;
  readonly createdAt: Date;
};

type BookmarksSheetProps = {
  readonly visible: boolean;
  readonly treeId: ULID | null;
  readonly onClose: () => void;
  /** Rewind the active path to this node (controller closes the sheet). */
  readonly onSelectNode: (nodeId: ULID) => void | Promise<void>;
  /** Open the node detail sheet for this node. */
  readonly onShowDetail: (nodeId: ULID) => void;
};

const PREVIEW_LIMIT = 160;

const toBookmarkRow = (node: Node): BookmarkRow => {
  const text =
    node.content.type === 'text'
      ? node.content.text
      : `[${node.content.type}]`;
  return {
    nodeId: node.id,
    localId: String(node.localId),
    label: node.metadata.bookmarkLabel,
    authorType: node.authorType,
    previewText:
      text.length > PREVIEW_LIMIT
        ? `${text.slice(0, PREVIEW_LIMIT - 1).trimEnd()}…`
        : text,
    createdAt: node.createdAt,
  };
};

/**
 * Browse this tree's bookmarked nodes. Tap a row to rewind the active path
 * to that node; tap "Details" for the node detail sheet.
 */
export const BookmarksSheet = ({
  visible,
  treeId,
  onClose,
  onSelectNode,
  onShowDetail,
}: BookmarksSheetProps) => {
  const { colors } = useAspenGroveTheme();
  const { repositories } = useAppServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<readonly BookmarkRow[]>([]);

  useEffect(() => {
    if (!visible || !treeId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    repositories.nodeRepo
      .findBookmarked(treeId)
      .then((nodes) => {
        if (cancelled) {
          return;
        }
        const rows = nodes.map(toBookmarkRow);
        rows.sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        );
        setBookmarks(rows);
      })
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
  }, [repositories.nodeRepo, treeId, visible]);

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
            Bookmarks
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

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerWrap}>
            <AppText variant="meta" tone="accent">
              {error}
            </AppText>
          </View>
        ) : bookmarks.length === 0 ? (
          <View style={styles.centerWrap}>
            <AppText variant="meta" tone="muted">
              No bookmarks in this tree yet. Long-press a message and choose
              Bookmark.
            </AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {bookmarks.map((bookmark) => (
              <Pressable
                key={bookmark.nodeId}
                onPress={() => void onSelectNode(bookmark.nodeId)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.line },
                  { opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <View style={styles.rowHeader}>
                  <AppText variant="meta" tone="secondary">
                    {bookmark.label
                      ? `${bookmark.label} · ${bookmark.localId}`
                      : bookmark.localId}{' '}
                    · {bookmark.authorType}
                  </AppText>
                  <Pressable
                    onPress={() => onShowDetail(bookmark.nodeId)}
                    hitSlop={8}
                  >
                    <AppText variant="meta" style={{ color: colors.primary }}>
                      Details
                    </AppText>
                  </Pressable>
                </View>
                <AppText variant="body" style={styles.previewText}>
                  {bookmark.previewText}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}
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
  centerWrap: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.9,
  },
});
