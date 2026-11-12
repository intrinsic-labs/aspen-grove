import { useCallback, useRef, type ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { LoomTree } from '@domain/entities';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { TreeRow } from './TreeRow';

const list = loomUiTokens.home.list;

type TreeListProps = {
  readonly trees: readonly LoomTree[];
  readonly header: ReactElement | null;
  /** Room under the rows for the floating composer. */
  readonly bottomInset: number;
  readonly onOpen: (tree: LoomTree) => void;
  readonly onRename: (tree: LoomTree) => void;
  readonly onDelete: (tree: LoomTree) => void;
};

/**
 * Home's recent trees as one inset-grouped section (HomeScreenView.swift:
 * 64-105): the rows share a rounded card, with a clear 40 pt section under
 * them. One row's swipe actions are open at a time.
 */
export const TreeList = ({
  trees,
  header,
  bottomInset,
  onOpen,
  onRename,
  onDelete,
}: TreeListProps) => {
  const closeOpenRow = useRef<(() => void) | null>(null);
  const onSwipeOpen = useCallback((close: () => void) => {
    if (closeOpenRow.current !== close) {
      closeOpenRow.current?.();
    }
    closeOpenRow.current = close;
  }, []);

  return (
    <FlatList
      testID="home-trees-list"
      data={trees}
      keyExtractor={(tree) => tree.id}
      ListHeaderComponent={header}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingBottom: bottomInset + list.footerHeight,
      }}
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.cardSlice,
            index === 0 ? styles.cardTop : null,
            index === trees.length - 1 ? styles.cardBottom : null,
          ]}
        >
          <TreeRow
            tree={item}
            last={index === trees.length - 1}
            onOpen={onOpen}
            onRename={onRename}
            onDelete={onDelete}
            onSwipeOpen={onSwipeOpen}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  // Each row is a slice of the one card: clipped to its rounded corners at
  // the top and bottom of the section.
  cardSlice: {
    marginHorizontal: list.sectionInset,
    overflow: 'hidden',
  },
  cardTop: {
    marginTop: list.topGap,
    borderTopLeftRadius: list.cardRadius,
    borderTopRightRadius: list.cardRadius,
  },
  cardBottom: {
    borderBottomLeftRadius: list.cardRadius,
    borderBottomRightRadius: list.cardRadius,
  },
});
