import { useCallback } from 'react';
import { Keyboard } from 'react-native';
import type { ULID } from '@domain/value-objects';
import type { ChatMessageMenuAction } from '../message-list/message-menu';
import type { useNodeContinuations } from '../useNodeContinuations';

type NodeAction = (nodeId: ULID) => Promise<void>;

type UseMessageActionsInput = {
  readonly continuations: Pick<
    ReturnType<typeof useNodeContinuations>,
    'visible' | 'sourceNodeId' | 'showForNode' | 'hide'
  >;
  readonly regenerateFromNode: NodeAction;
  readonly startEditForNode: NodeAction;
  readonly rewindToNode: NodeAction;
  readonly copyNodeText: NodeAction;
  /** Opens the node's "Node Info" sheet. */
  readonly openNodeInfo: (nodeId: ULID) => void;
  readonly toggleBookmark: NodeAction;
  readonly togglePrune: NodeAction;
};

/**
 * Message-row gestures: the long-press menu routes each action to its
 * handler; a single tap toggles that node's continuation rail.
 */
export const useMessageActions = ({
  continuations,
  regenerateFromNode,
  startEditForNode,
  rewindToNode,
  copyNodeText,
  openNodeInfo,
  toggleBookmark,
  togglePrune,
}: UseMessageActionsInput) => {
  const onMessageAction = useCallback(
    async (nodeId: string, action: ChatMessageMenuAction) => {
      const targetNodeId = nodeId as ULID;
      switch (action) {
        case 'regenerate':
          await regenerateFromNode(targetNodeId);
          break;
        case 'continuations':
          Keyboard.dismiss();
          await continuations.showForNode(targetNodeId);
          break;
        case 'edit':
          await startEditForNode(targetNodeId);
          break;
        case 'rewind':
          await rewindToNode(targetNodeId);
          break;
        case 'copy':
          await copyNodeText(targetNodeId);
          break;
        case 'info':
          openNodeInfo(targetNodeId);
          break;
        case 'bookmark':
          await toggleBookmark(targetNodeId);
          break;
        case 'prune':
          await togglePrune(targetNodeId);
          break;
      }
    },
    [
      continuations,
      copyNodeText,
      openNodeInfo,
      regenerateFromNode,
      rewindToNode,
      startEditForNode,
      toggleBookmark,
      togglePrune,
    ]
  );

  // Single-tap opens that node's continuation rail. Tapping the
  // already-open source closes it.
  const onNodeTap = useCallback(
    (nodeId: ULID) => {
      Keyboard.dismiss();
      if (continuations.visible && continuations.sourceNodeId === nodeId) {
        continuations.hide();
        return;
      }
      void continuations.showForNode(nodeId);
    },
    [continuations]
  );

  return { onMessageAction, onNodeTap };
};
