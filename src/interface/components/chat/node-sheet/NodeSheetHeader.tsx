import { StyleSheet, Text, View } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassIconButton } from '@/interface/ui/components/GlassIconButton';
import {
  findNativeMenuItem,
  toNativeMenuActions,
  type NativeMenuSections,
} from '@/interface/ui/components/native-menu';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';

const sheet = loomUiTokens.nodeSheet;
const header = loomUiTokens.sheetHeader;

/**
 * The symbol before the model: a green check on a continuation the active
 * path runs through, a bookmark (filled while set) on a bookmark's sheet.
 */
export type NodeSheetBadge = 'check' | 'bookmark' | 'bookmarked';

const BADGE_ICON = {
  check: 'checkmark-circle',
  bookmark: 'bookmark-outline',
  bookmarked: 'bookmark',
} as const;

type NodeSheetHeaderProps<Action extends string> = {
  readonly title: string;
  /** The model it came from; absent while the node loads. */
  readonly modelLabel?: string;
  readonly count?: number;
  readonly badge?: NodeSheetBadge;
  /** Absent while the node loads. */
  readonly menu?: NativeMenuSections<Action>;
  readonly onMenuAction: (action: Action) => void;
  readonly onBack: () => void;
};

/**
 * A node sheet's toolbar (NodeSheetView.swift:26-53, BookmarkSheet.swift:
 * 30-58): a glass back button, the title over the model (and `[n]`), and a
 * glass menu button.
 */
export const NodeSheetHeader = <Action extends string>({
  title,
  modelLabel,
  count,
  badge,
  menu,
  onMenuAction,
  onBack,
}: NodeSheetHeaderProps<Action>) => (
  <View style={styles.bar}>
    <GlassIconButton
      testID="node-sheet-back"
      icon="chevron-back"
      iconSize={sheet.chevronSize}
      size={sheet.circleSize}
      accessibilityLabel="Back"
      onPress={onBack}
    />
    <View style={styles.titles}>
      <Text testID="node-sheet-title" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {modelLabel !== undefined ? (
        <View testID="node-sheet-subtitle" style={styles.subtitle}>
          {badge ? (
            <Ionicons
              testID={
                badge === 'check' ? 'node-sheet-check' : 'node-sheet-bookmark'
              }
              name={BADGE_ICON[badge]}
              size={sheet.subtitleSize + 2}
              color={
                badge === 'check'
                  ? loomUiTokens.colors.green
                  : loomUiTokens.settingsForm.colors.secondaryLabel
              }
            />
          ) : null}
          <Text numberOfLines={1} style={[styles.caption, styles.model]}>
            {modelLabel}
          </Text>
          {count !== undefined ? (
            <Text style={styles.caption}>[{count}]</Text>
          ) : null}
        </View>
      ) : null}
    </View>
    {menu ? (
      <ContextMenu
        dropdownMenuMode
        actions={toNativeMenuActions(menu)}
        onPress={(event) => {
          const item = findNativeMenuItem(menu, event.nativeEvent);
          if (item) {
            onMenuAction(item.action);
          }
        }}
      >
        <GlassIconButton
          testID="node-sheet-menu-button"
          icon="ellipsis-horizontal-circle-outline"
          iconSize={sheet.ellipsisSize}
          size={sheet.circleSize}
          accessibilityLabel="Node menu"
        />
      </ContextMenu>
    ) : (
      <View style={styles.placeholder} />
    )}
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: header.topPadding,
    paddingHorizontal: header.sideInset,
  },
  titles: {
    flex: 1,
    alignItems: 'center',
    gap: sheet.subtitleGap,
  },
  title: {
    fontSize: sheet.titleSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sheet.subtitleItemGap,
    maxWidth: '100%',
  },
  caption: {
    fontSize: sheet.subtitleSize,
    color: loomUiTokens.settingsForm.colors.secondaryLabel,
  },
  model: {
    flexShrink: 1,
  },
  placeholder: {
    width: sheet.circleSize,
    height: sheet.circleSize,
  },
});
