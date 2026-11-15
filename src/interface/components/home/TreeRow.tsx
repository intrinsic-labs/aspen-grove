import { memo, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { LoomTree } from '@domain/entities';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { treeLastUsed, treeRowDateText } from './tree-recency';
import { TreeRowAction } from './TreeRowAction';

const list = loomUiTokens.home.list;
const swipe = loomUiTokens.home.swipe;
const form = loomUiTokens.settingsForm.colors;

type TreeRowProps = {
  readonly tree: LoomTree;
  readonly last: boolean;
  readonly onOpen: (tree: LoomTree) => void;
  readonly onRename: (tree: LoomTree) => void;
  readonly onDelete: (tree: LoomTree) => void;
  /** This row's swipe opened, with how to close it: others close, as in a List. */
  readonly onSwipeOpen: (close: () => void) => void;
};

/**
 * A tree in Home's list (HomeScreenView.swift:66-99): the title in the mono
 * face on one line, the date under it, a disclosure chevron. Swipe right for
 * "Edit Name", left for Delete.
 */
export const TreeRow = memo(
  ({ tree, last, onOpen, onRename, onDelete, onSwipeOpen }: TreeRowProps) => {
    const { colors } = useAspenGroveTheme();
    const swipeableRef = useRef<SwipeableMethods>(null);
    const [open, setOpen] = useState(false);
    const close = useCallback(() => swipeableRef.current?.close(), []);

    return (
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={1}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={40}
        rightThreshold={40}
        onSwipeableWillOpen={() => {
          setOpen(true);
          onSwipeOpen(close);
        }}
        onSwipeableWillClose={() => setOpen(false)}
        renderLeftActions={() => (
          <TreeRowAction
            testID={`home-trees-rename-${tree.id}`}
            label="Edit Name"
            tint={swipe.renameTint}
            edge="leading"
            onPress={() => {
              close();
              onRename(tree);
            }}
          />
        )}
        renderRightActions={() => (
          <TreeRowAction
            testID={`home-trees-delete-${tree.id}`}
            label="Delete"
            tint={swipe.deleteTint}
            edge="trailing"
            onPress={() => {
              close();
              onDelete(tree);
            }}
          />
        )}
      >
        <Pressable
          testID={`home-trees-row-${tree.id}`}
          accessibilityRole="button"
          onPress={() => onOpen(tree)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed
                ? list.pressedBackground
                : form.rowBackground,
              borderRadius: open ? swipe.openRowRadius : 0,
            },
          ]}
        >
          <View style={styles.text}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.primary }]}
            >
              {tree.title}
            </Text>
            <Text style={styles.date}>
              {treeRowDateText(treeLastUsed(tree))}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={list.chevronSize}
            color={list.chevronColor}
          />
          {last || open ? null : <View style={styles.separator} />}
        </Pressable>
      </ReanimatedSwipeable>
    );
  }
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: list.rowPaddingHorizontal,
    paddingVertical: list.rowPaddingVertical,
    gap: 8,
  },
  text: {
    flex: 1,
    gap: list.titleDateGap,
  },
  title: {
    fontFamily: list.titleFontFamily,
    fontSize: list.titleFontSize,
    lineHeight: list.titleLineHeight,
  },
  date: {
    fontSize: list.dateFontSize,
    lineHeight: list.dateLineHeight,
    color: form.secondaryLabel,
  },
  separator: {
    position: 'absolute',
    left: list.separatorInset,
    right: list.separatorInset,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: list.separatorColor,
  },
});
