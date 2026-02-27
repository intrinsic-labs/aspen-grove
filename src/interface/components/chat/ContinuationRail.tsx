import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ContextMenu, { type ContextMenuAction } from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@interface/ui/system';
import type { ContinuationPreview } from './types';

export type ContinuationMenuAction =
  | 'makeCurrent'
  | 'retrace'
  | 'copy'
  | 'bookmark';

type ContinuationRailProps = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly sourceLocalId?: string;
  readonly selectedNodeId?: ULID;
  readonly continuations: readonly ContinuationPreview[];
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMakeCurrent: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly onClose: () => void;
  readonly colors: {
    readonly line: string;
    readonly surface: string;
    readonly backgroundMuted: string;
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly green: string;
    readonly red: string;
  };
};

const TRUNCATE_LIMIT = 220;

const truncateText = (value: string): string => {
  if (value.length <= TRUNCATE_LIMIT) {
    return value;
  }
  return `${value.slice(0, TRUNCATE_LIMIT - 1).trimEnd()}…`;
};

export const ContinuationRail = memo(
  ({
    visible,
    loading,
    sourceLocalId,
    selectedNodeId,
    continuations,
    error,
    onSelect,
    onMakeCurrent,
    onMenuAction,
    onClose,
    colors,
  }: ContinuationRailProps) => {
    if (!visible) {
      return null;
    }

    return (
      <View
        style={[
          styles.wrap,
          {
            borderTopColor: colors.line,
            borderBottomColor: colors.line,
            backgroundColor: colors.backgroundMuted,
          },
        ]}
      >
        <View style={styles.header}>
          <AppText variant="meta" tone="secondary" style={styles.headerTitle}>
            {sourceLocalId ? `Continuations for ${sourceLocalId}` : 'Continuations'}
          </AppText>
          <Pressable onPress={onClose} hitSlop={10}>
            <AppText variant="meta" tone="muted">
              Close
            </AppText>
          </Pressable>
        </View>

        {loading ? (
          <AppText variant="meta" tone="muted" style={styles.emptyText}>
            Loading continuations...
          </AppText>
        ) : error ? (
          <AppText variant="meta" tone="accent" style={styles.emptyText}>
            {error}
          </AppText>
        ) : continuations.length === 0 ? (
          <AppText variant="meta" tone="muted" style={styles.emptyText}>
            No continuations yet.
          </AppText>
        ) : (
          <>
            <AppText variant="meta" tone="muted" style={styles.hintText}>
              Tap to preview. Double tap to make current. Long press for options.
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {continuations.map((item) => {
                const isSelected = selectedNodeId === item.nodeId;
                const menuItems = buildContinuationMenuItems(item.isBookmarked);
                const menuActions: ContextMenuAction[] = menuItems.map((menuItem) => ({
                  title: menuItem.title,
                  systemIcon: menuItem.systemIcon,
                }));
                return (
                  <ContextMenu
                    key={item.nodeId}
                    title={item.localId}
                    actions={menuActions}
                    onPress={(event) => {
                      const menuItem = menuItems[event.nativeEvent.index];
                      if (menuItem) {
                        onMenuAction(item.nodeId, menuItem.action);
                      }
                    }}
                  >
                    <Pressable
                      onPress={() => onSelect(item.nodeId)}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isSelected ? colors.red : colors.line,
                        },
                      ]}
                    >
                      <View style={styles.inner}>
                        <AppText variant="meta" tone="secondary" style={styles.metaLine}>
                          {item.localId} [{item.onBranchCount}]
                        </AppText>
                        <AppText variant="mono" tone="primary" style={styles.previewText}>
                          {truncateText(item.previewText)}
                        </AppText>
                        <View style={styles.footer}>
                          {item.isOnActivePath ? (
                            <AppText variant="meta" tone="primary" style={{ color: colors.green }}>
                              Current Branch
                            </AppText>
                          ) : (
                            <View />
                          )}
                          {item.isBookmarked ? (
                            <AppText variant="meta" tone="secondary">
                              Bookmarked
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                      <Pressable
                        onPress={() => onMakeCurrent(item.nodeId)}
                        hitSlop={8}
                        style={styles.makeCurrentButton}
                      >
                        <AppText variant="meta" tone="secondary">
                          Use
                        </AppText>
                      </Pressable>
                    </Pressable>
                  </ContextMenu>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>
    );
  }
);

type ContinuationMenuItem = {
  readonly action: ContinuationMenuAction;
  readonly title: string;
  readonly systemIcon?: string;
};

const buildContinuationMenuItems = (
  bookmarked: boolean
): readonly ContinuationMenuItem[] =>
  [
    {
      action: 'makeCurrent',
      title: 'Make Current Node',
      systemIcon: 'checkmark.circle',
    },
    {
      action: 'retrace',
      title: 'Retrace Branch',
      systemIcon: 'arrow.uturn.backward',
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'bookmark',
      title: bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: bookmarked ? 'bookmark.slash' : 'bookmark',
    },
  ] as const;

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  headerTitle: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hintText: {
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  emptyText: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  content: {
    paddingHorizontal: 18,
    gap: 10,
  },
  card: {
    width: 260,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  inner: {
    gap: 8,
  },
  metaLine: {
    letterSpacing: 0.4,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 23,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  makeCurrentButton: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
});
