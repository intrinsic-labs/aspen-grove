import type { ULID } from '@domain/value-objects';

/**
 * Which sheet a node opens in: "Node Info" from a message's menu
 * (NodeSheetView.swift), or "Continuation Node" from a card
 * (ChildNodeView.swift:53-96).
 */
export type NodeSheetKind = 'info' | 'continuation';

export type NodeSheetTarget = {
  readonly nodeId: ULID;
  readonly kind: NodeSheetKind;
};

export const nodeSheetTitle: Record<NodeSheetKind, string> = {
  info: 'Node Info',
  continuation: 'Continuation Node',
};
