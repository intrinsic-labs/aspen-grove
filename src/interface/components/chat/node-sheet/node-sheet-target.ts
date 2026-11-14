import type { ULID } from '@domain/value-objects';

/**
 * Which sheet a node opens in: "Node Info" from a message's menu
 * (NodeSheetView.swift), "Continuation Node" from a card
 * (ChildNodeView.swift:53-96), or a bookmark from the tree menu's
 * Bookmarks (BookmarkSheet.swift).
 */
export type NodeSheetKind = 'info' | 'continuation' | 'bookmark';

export type NodeSheetTarget = {
  readonly nodeId: ULID;
  readonly kind: NodeSheetKind;
};

export const nodeSheetTitle: Record<NodeSheetKind, string> = {
  info: 'Node Info',
  continuation: 'Continuation Node',
  // A bookmark's sheet shows its label, else this.
  bookmark: 'Bookmarked Node',
};
