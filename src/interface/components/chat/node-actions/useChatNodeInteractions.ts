import { useCallback, useMemo } from 'react';
import type { ULID } from '@domain/value-objects';
import type { useTextPrompt } from '@/interface/ui/components/text-prompt/useTextPrompt';
import { renameBookmarkPrompt } from '../node-sheet/bookmark-menu';
import { useNodeSheet } from '../node-sheet/useNodeSheet';
import { useRouteNodeSheet } from '../node-sheet/useRouteNodeSheet';
import { useReadAloudTaps } from '../read-aloud/useReadAloudTaps';
import type { ChatRow } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';
import { useContinuationGestures } from './useContinuationGestures';
import { useMessageActions } from './useMessageActions';
import type { useNodeActions } from './useNodeActions';

type NodeAction = (nodeId: ULID) => Promise<void>;

type UseChatNodeInteractionsInput = {
  /** The active path's rows, top to bottom. */
  readonly rows: readonly ChatRow[];
  readonly nodeActions: ReturnType<typeof useNodeActions>;
  readonly continuations: ReturnType<typeof useNodeContinuations>;
  readonly rewindToNode: NodeAction;
  readonly retraceBranch: NodeAction;
  readonly startEditForNode: NodeAction;
  readonly regenerateFromNode: NodeAction;
  /** Asks for text (iOS alert, Android dialog); null when cancelled. */
  readonly prompt: ReturnType<typeof useTextPrompt>['prompt'];
  /** Voice Mode's tap options (`useChatReadAloud().tapOptions`). */
  readonly readAloudTapOptions: Omit<
    Parameters<typeof useReadAloudTaps>[0],
    'onSingleTap'
  >;
  /** The route's `nodeSheetId` (a search result opens its tree on it). */
  readonly nodeSheetId: string | undefined;
  /** The tree has loaded, so a route-driven sheet can act on its path. */
  readonly ready: boolean;
};

/**
 * What a tap, double-tap or menu on a message, a continuation card or the
 * node sheet does: the node sheet and its menus, the route-driven Node Info
 * sheet, message menus, Voice Mode taps and continuation-card gestures.
 *
 * Hook order inside is the controller's original order (route-driven node
 * sheet, then the tap-timer cleanups), so effects still run in that order.
 */
export const useChatNodeInteractions = ({
  rows,
  nodeActions,
  continuations,
  rewindToNode,
  retraceBranch,
  startEditForNode,
  regenerateFromNode,
  prompt,
  readAloudTapOptions,
  nodeSheetId,
  ready,
}: UseChatNodeInteractionsInput) => {
  const nodeSheet = useNodeSheet({
    rewindToNode,
    retraceBranch,
    copyNodeText: nodeActions.copyNodeText,
    toggleBookmark: nodeActions.toggleBookmark,
    togglePrune: nodeActions.togglePrune,
    startEditForNode,
    renameBookmark: async (nodeId, label) => {
      const next = await prompt(renameBookmarkPrompt(label));
      if (next !== null) {
        await nodeActions.renameBookmark(nodeId, next);
      }
    },
  });
  const openNodeSheet = nodeSheet.open;
  const openNodeInfo = useCallback(
    (nodeId: ULID) => openNodeSheet(nodeId, 'info'),
    [openNodeSheet]
  );
  const openContinuationSheet = useCallback(
    (nodeId: ULID) => openNodeSheet(nodeId, 'continuation'),
    [openNodeSheet]
  );
  useRouteNodeSheet({ nodeSheetId, ready, openNodeInfo });

  const { onMessageAction, onNodeTap: toggleRailForNode } = useMessageActions({
    continuations,
    regenerateFromNode,
    startEditForNode,
    rewindToNode,
    copyNodeText: nodeActions.copyNodeText,
    openNodeInfo,
    toggleBookmark: nodeActions.toggleBookmark,
    togglePrune: nodeActions.togglePrune,
  });
  const onNodeTap = useReadAloudTaps({
    onSingleTap: toggleRailForNode,
    ...readAloudTapOptions,
  });
  const { onContinuationSelect, onContinuationMenuAction } =
    useContinuationGestures({
      continuations,
      rewindToNode,
      retraceBranch,
      copyNodeText: nodeActions.copyNodeText,
      openContinuationSheet,
    });

  const activePathNodeIds = useMemo(() => rows.map((row) => row.id), [rows]);

  return {
    nodeSheetView: {
      target: nodeSheet.target,
      activePathNodeIds,
      close: nodeSheet.close,
      onDismissed: nodeSheet.onDismissed,
      onInfoAction: nodeSheet.onInfoAction,
      onContinuationAction: nodeSheet.onContinuationAction,
      onBookmarkAction: nodeSheet.onBookmarkAction,
    },
    openBookmark: (nodeId: ULID) => openNodeSheet(nodeId, 'bookmark'),
    onMessageAction,
    onNodeTap,
    onContinuationSelect,
    onContinuationMenuAction,
  };
};
