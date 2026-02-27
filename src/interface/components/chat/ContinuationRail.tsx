import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ContextMenu, { type ContextMenuAction } from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@interface/ui/system';
import { loomUiTokens } from './loom-ui-tokens';
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
    readonly red: string;
  };
};

const truncateText = (value: string): string => {
  if (value.length <= loomUiTokens.continuationRail.truncateLimit) {
    return value;
  }
  return `${value
    .slice(0, loomUiTokens.continuationRail.truncateLimit - 1)
    .trimEnd()}…`;
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
          <Pressable onPress={onClose} hitSlop={loomUiTokens.continuationRail.closeHitSlop}>
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
                            <AppText
                              variant="meta"
                              tone="primary"
                              style={{ color: loomUiTokens.colors.successGreen }}
                            >
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
                        hitSlop={loomUiTokens.continuationRail.useButtonHitSlop}
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
    paddingTop: loomUiTokens.continuationRail.verticalPadding,
    paddingBottom: loomUiTokens.continuationRail.verticalPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    marginBottom: loomUiTokens.continuationRail.headerBottomMargin,
  },
  headerTitle: {
    letterSpacing: loomUiTokens.continuationRail.headerLetterSpacing,
    textTransform: 'uppercase',
  },
  hintText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    marginBottom: loomUiTokens.continuationRail.hintBottomMargin,
  },
  emptyText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.emptyVerticalPadding,
  },
  content: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    gap: loomUiTokens.continuationRail.contentGap,
  },
  card: {
    width: loomUiTokens.continuationRail.cardWidth,
    borderRadius: loomUiTokens.continuationRail.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: loomUiTokens.continuationRail.cardPadding,
    gap: loomUiTokens.continuationRail.cardGap,
  },
  inner: {
    gap: loomUiTokens.continuationRail.cardGap,
  },
  metaLine: {
    letterSpacing: loomUiTokens.continuationRail.metaLetterSpacing,
  },
  previewText: {
    fontSize: loomUiTokens.continuationRail.previewTextSize,
    lineHeight: loomUiTokens.continuationRail.previewTextLineHeight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  makeCurrentButton: {
    alignSelf: 'flex-end',
    marginTop: loomUiTokens.continuationRail.useButtonMarginTop,
  },
});
