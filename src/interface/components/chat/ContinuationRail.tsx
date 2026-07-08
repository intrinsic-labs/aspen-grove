import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import type { ContinuationPreview } from './types';

export type ContinuationMenuAction = 'makeCurrent' | 'copy' | 'bookmark';

type ContinuationRailProps = {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly sourceLocalId?: string;
  readonly continuations: readonly ContinuationPreview[];
  readonly error?: string | null;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
};

export const ContinuationRail = memo(
  ({
    visible,
    loading,
    sourceLocalId,
    continuations,
    error,
    onSelect,
    onMenuAction,
  }: ContinuationRailProps) => {
    const { colors } = useAspenGroveTheme();

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
          },
        ]}
      >
        <View style={styles.header}>
          <AppText variant="meta" tone="secondary" style={styles.headerTitle}>
            {sourceLocalId
              ? `Continuations for ${sourceLocalId}`
              : 'Continuations'}
          </AppText>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {continuations.map((item) => {
                const menuItems = buildContinuationMenuItems(item.isBookmarked);
                const menuActions: ContextMenuAction[] = menuItems.map(
                  (menuItem) => ({
                    title: menuItem.title,
                    systemIcon: menuItem.systemIcon,
                  })
                );
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
                          borderColor: colors.line,
                        },
                      ]}
                    >
                      <View style={styles.metaRow}>
                        <AppText
                          variant="meta"
                          tone="secondary"
                          style={
                            item.isOnActivePath
                              ? [styles.metaLine, { color: colors.green }]
                              : styles.metaLine
                          }
                        >
                          {item.localId} [{item.onBranchCount}]
                          {item.isOnActivePath ? '  ●' : ''}
                        </AppText>
                        {item.isBookmarked ? (
                          <Ionicons
                            name="bookmark"
                            size={11}
                            color={colors.secondary}
                          />
                        ) : null}
                      </View>
                      <AppText
                        variant="mono"
                        tone="primary"
                        numberOfLines={
                          loomUiTokens.continuationRail.previewTextMaxLines
                        }
                        style={styles.previewText}
                      >
                        {item.previewText}
                      </AppText>
                    </Pressable>
                  </ContextMenu>
                );
              })}
            </ScrollView>
            <AppText variant="meta" tone="muted" style={styles.hintText}>
              Tap for details. Double tap to retrace branch. Long press for
              options.
            </AppText>
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
    justifyContent: 'center',
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.headerVerticalPadding,
    marginBottom: loomUiTokens.continuationRail.headerBottomMargin,
  },
  headerTitle: {
    letterSpacing: loomUiTokens.continuationRail.headerLetterSpacing,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  hintText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.hintVerticalPadding,
    marginTop: loomUiTokens.continuationRail.hintTopMargin,
    textAlign: 'center',
  },
  emptyText: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingVertical: loomUiTokens.continuationRail.emptyVerticalPadding,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    gap: loomUiTokens.continuationRail.contentGap,
  },
  card: {
    width: loomUiTokens.continuationRail.cardWidth,
    height: loomUiTokens.continuationRail.cardHeight,
    borderRadius: loomUiTokens.continuationRail.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: loomUiTokens.continuationRail.cardPadding,
    gap: loomUiTokens.continuationRail.cardGap,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLine: {
    letterSpacing: loomUiTokens.continuationRail.metaLetterSpacing,
  },
  previewText: {
    fontSize: loomUiTokens.continuationRail.previewTextSize,
    lineHeight: loomUiTokens.continuationRail.previewTextLineHeight,
  },
});
