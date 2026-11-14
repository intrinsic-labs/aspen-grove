import type { NativeMenuSections } from '@/interface/ui/components/native-menu';

export type NodeInfoMenuAction =
  | 'copy'
  | 'rewind'
  | 'bookmark'
  | 'edit'
  | 'prune';

export type NodeInfoMenuState = {
  readonly isCurrent: boolean;
  readonly bookmarked: boolean;
  readonly pruned: boolean;
};

/**
 * The Node Info sheet's menu (NodeSheetView.swift:75-107): Copy All Text,
 * Rewind To Node (off on the current node) and Bookmark ("Bookmarked" once
 * set). Aspen Grove's Edit and Prune follow after a divider, as on the
 * message menu.
 */
export const buildNodeInfoMenuSections = (
  state: NodeInfoMenuState
): NativeMenuSections<NodeInfoMenuAction> => [
  [
    { action: 'copy', title: 'Copy All Text', systemIcon: 'doc.on.doc' },
    {
      action: 'rewind',
      title: 'Rewind To Node',
      systemIcon: 'backward',
      disabled: state.isCurrent,
    },
    {
      action: 'bookmark',
      title: state.bookmarked ? 'Bookmarked' : 'Bookmark',
      systemIcon: state.bookmarked ? 'bookmark.fill' : 'bookmark',
    },
  ],
  [
    { action: 'edit', title: 'Edit', systemIcon: 'pencil' },
    {
      action: 'prune',
      title: state.pruned ? 'Restore' : 'Prune',
      systemIcon: state.pruned ? 'arrow.uturn.backward.circle' : 'scissors',
      destructive: !state.pruned,
    },
  ],
];
